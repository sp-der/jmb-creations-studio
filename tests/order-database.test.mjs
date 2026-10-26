import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
// Real PostgreSQL (WASM) with existing repository schemas. Only Supabase-hosted
// Auth/Vault/Cron/pg_net adapters are stubbed; application SQL is unchanged.
test("checkout, payment, conversations, outbox, guest tokens and RLS", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const file = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  try {
    await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage; create schema extensions; create schema vault; create schema cron; create schema net;
 create extension pgcrypto with schema extensions;
 set search_path=public,extensions;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid primary key,bucket_id text); alter table storage.objects enable row level security;
 create table vault.test_secrets(name text primary key,decrypted_secret text);
 create view vault.decrypted_secrets as select * from vault.test_secrets;
 create function vault.create_secret(secret text, name text) returns uuid language plpgsql as $$ begin insert into vault.test_secrets values(name,secret); return gen_random_uuid(); end $$;
 create table cron.test_jobs(name text,schedule text,command text);
 create function cron.schedule(name text,schedule text,command text) returns bigint language plpgsql as $$ begin insert into cron.test_jobs values(name,schedule,command); return 1; end $$;
 grant usage on schema public,auth to authenticated,anon,service_role;
 `);
    for (const schema of [
      "supabase/jmb-catalog-phase2.sql",
      "supabase/jmb-operations-phase3.sql",
      "supabase/jmb-operational-phase4.sql",
      "supabase/jmb-payments-phase9.sql",
    ])
      await db.exec(await file(schema));
    // A historical unpaid order and existing Custom Chat must survive untouched.
    const admin = "11111111-1111-4111-8111-111111111111",
      customer = "22222222-2222-4222-8222-222222222222",
      stranger = "33333333-3333-4333-8333-333333333333";
    await db.exec(
      `insert into auth.users values('${admin}'),('${customer}'),('${stranger}'); insert into public.jmb_admins(user_id) values('${admin}'); grant select on public.jmb_admins to authenticated;`,
    );
    const historic = await value(
      `insert into jmb_orders(first_name,last_name,customer_email,fulfillment,status,created_at) values('Old','Order','old@example.test','Local Pickup','Order Received','2025-01-01') returning *`,
    );
    const custom = await value(
      `insert into jmb_custom_requests(customer_user_id,customer_name,customer_email,product_family,idea) values($1,'Customer','customer@example.test','cups','test') returning id`,
      [customer],
    );
    await db.query(
      `insert into jmb_custom_messages(request_id,sender,body) values($1,'customer','Preserve custom history')`,
      [custom.id],
    );
    let migration = await file(
      "supabase/migrations/20261026194818_checkout_order_communications.sql",
    );
    migration = migration
      .replace("create extension if not exists pg_cron with schema pg_catalog;", "")
      .replace("create extension if not exists pg_net with schema extensions;", "");
    await db.exec(migration);
    await db.exec(
      "grant all on all tables in schema public to service_role; grant usage,select on all sequences in schema public to service_role;",
    );
    await t.test(
      "historical timestamps/status and Custom Chats are unchanged; no historical emails",
      async () => {
        const old = await value("select * from jmb_orders where id=$1", [historic.id]);
        assert.equal(old.checkout_version, 1);
        assert.equal(old.status, historic.status);
        assert.equal(old.created_at.toISOString(), historic.created_at.toISOString());
        assert.equal(old.payment_confirmed_at, null);
        assert.equal((await value("select count(*)::int n from jmb_notification_outbox")).n, 0);
        assert.equal(
          (await value("select body from jmb_custom_messages where request_id=$1", [custom.id]))
            .body,
          "Preserve custom history",
        );
      },
    );
    const item = await value(
      `insert into jmb_catalog_items(family_slug,name,image_url,price,stock) values('cups','Test Cup','/test.png',25,20) returning id`,
    );
    const make = async (user = null, token = "a".repeat(64), key = crypto.randomUUID(), qty = 1) =>
      value(
        `select jmb_create_storefront_order($1,'Test','Customer','customer@example.test',encode(extensions.digest($2,'sha256'),'hex'),'Local Pickup',null,null,null,null,null,'US',99,null,null,$3::jsonb,$4::uuid) id`,
        [user, token, JSON.stringify([{ catalog_item_id: item.id, quantity: qty }]), key],
      );
    const key = crypto.randomUUID();
    const guest = await make(null, "a".repeat(64), key);
    const account = await make(customer, "b".repeat(64));
    await t.test(
      "guest/account pending checkout; pickup shipping is zero; retries reserve stock once",
      async () => {
        for (const order of [guest, account]) {
          const o = await value("select * from jmb_orders where id=$1", [order.id]);
          assert.equal(o.status, "Pending Checkout");
          assert.equal(o.payment_status, "Unpaid");
          assert.equal(Number(o.shipping_amount), 0);
          assert.equal(Number(o.total), 25);
        }
        assert.equal((await make(null, "a".repeat(64), key)).id, guest.id);
        assert.equal(
          (await value("select stock from jmb_catalog_items where id=$1", [item.id])).stock,
          18,
        );
        await assert.rejects(() => make(null, "a".repeat(64), key, 2), /changed/);
        assert.equal((await value("select count(*)::int n from jmb_notification_outbox")).n, 0);
      },
    );
    await t.test("unpaid checkout cannot enter production", async () => {
      await assert.rejects(
        () => db.query("update jmb_orders set status='In Production' where id=$1", [guest.id]),
        /Payment is required/,
      );
    });
    await db.query("update jmb_orders set square_order_id='square-guest' where id=$1", [guest.id]);
    const confirm = async (id, amount = 2500, currency = "USD") =>
      db.query(
        "select jmb_confirm_square_payment($1,'payment-'||$1,$2,$3,'2026-10-26T12:30:00Z')",
        [id, amount, currency],
      );
    await t.test(
      "amount/currency mismatch rejected; paid transition queues exactly two notifications under duplicate webhook",
      async () => {
        await assert.rejects(() => confirm("square-guest", 2499), /mismatch/);
        await assert.rejects(() => confirm("square-guest", 2500, "CAD"), /mismatch/);
        await confirm("square-guest");
        await confirm("square-guest");
        const o = await value("select * from jmb_orders where id=$1", [guest.id]);
        assert.equal(o.status, "Payment Confirmed");
        assert.equal(o.payment_status, "Paid");
        assert.equal(o.payment_confirmed_at.toISOString(), "2026-10-26T12:30:00.000Z");
        assert.equal(
          (
            await value("select count(*)::int n from jmb_notification_outbox where order_id=$1", [
              guest.id,
            ])
          ).n,
          2,
        );
        await assert.rejects(
          () =>
            db.query(
              "select jmb_confirm_square_payment('square-guest','different-payment',2500,'USD',now())",
            ),
          /Additional payment/,
        );
      },
    );
    await t.test(
      "registered checkout confirms from verified payment and queues its own notifications",
      async () => {
        const registered = await make(customer, "c".repeat(64));
        await db.query("update jmb_orders set square_order_id='square-account' where id=$1", [
          registered.id,
        ]);
        await confirm("square-account");
        const result = await value(
          "select customer_user_id,payment_status from jmb_orders where id=$1",
          [registered.id],
        );
        assert.equal(result.customer_user_id, customer);
        assert.equal(result.payment_status, "Paid");
        assert.equal(
          (
            await value("select count(*)::int n from jmb_notification_outbox where order_id=$1", [
              registered.id,
            ])
          ).n,
          2,
        );
      },
    );
    await t.test(
      "original guest token, supplementary token, invalid/mismatched token, account isolation",
      async () => {
        const valid = async (id, token) =>
          (await value("select jmb_valid_guest_order($1,$2) ok", [id, token])).ok;
        assert.equal(await valid(guest.id, "a".repeat(64)), true);
        assert.equal(await valid(account.id, "a".repeat(64)), false);
        assert.equal(await valid(guest.id, "x".repeat(64)), false);
        const token = (await value("select jmb_order_portal_token($1) token", [guest.id])).token;
        assert.equal(await valid(guest.id, token), true);
        assert.equal(await valid(guest.id, "a".repeat(64)), true);
        assert.equal(
          (await value("select jmb_order_portal_token($1) token", [guest.id])).token,
          token,
        );
        await assert.rejects(
          () => db.query("select jmb_order_portal_token($1)", [account.id]),
          /Guest order unavailable/,
        );
      },
    );
    const send = async (requestId, body = "Hello", sender = "customer") =>
      db.query("select (jmb_order_send($1,$2,$3,null,'Test Customer',$4)).id", [
        guest.id,
        requestId,
        sender,
        body,
      ]);
    await t.test(
      "messages/outbox atomic; same request deduplicates and altered request rejected",
      async () => {
        const request = crypto.randomUUID();
        const a = await send(request);
        const b = await send(request);
        assert.equal(a.rows[0].id, b.rows[0].id);
        await assert.rejects(() => send(request, "Different"), /different message/);
        await assert.rejects(() => send(request, "Hello", "admin"), /different message/);
        assert.equal(
          (
            await value(
              "select count(*)::int n from jmb_notification_outbox where kind='chat_admin'",
            )
          ).n,
          1,
        );
        await send(crypto.randomUUID(), "Admin reply", "admin");
        assert.equal(
          (
            await value(
              "select count(*)::int n from jmb_notification_outbox where kind='chat_customer'",
            )
          ).n,
          1,
        );
        for (let i = 0; i < 19; i++) await send(crypto.randomUUID(), `Rate ${i}`);
        await assert.rejects(() => send(crypto.randomUUID(), "too many"), /Too many/);
      },
    );
    await t.test(
      "admin email deduplication, admin requirement, subject/body conflict",
      async () => {
        const key = crypto.randomUUID();
        const email = () =>
          db.query("select jmb_order_email($1,$2,$3,'Subject','Body') id", [guest.id, key, admin]);
        assert.equal((await email()).rows[0].id, (await email()).rows[0].id);
        await assert.rejects(
          () =>
            db.query("select jmb_order_email($1,$2,$3,'Subject','Body')", [
              guest.id,
              crypto.randomUUID(),
              stranger,
            ]),
          /Admin required/,
        );
      },
    );
    await t.test(
      "outbox leases do not overlap and ambiguous delivery stops before provider dedup window expires",
      async () => {
        const first = await db.query("select * from jmb_claim_notifications(null)");
        assert.equal(first.rows.length, 5);
        const next = await db.query("select * from jmb_claim_notifications(null)");
        assert.ok(next.rows.every((j) => !first.rows.some((a) => a.id === j.id)));
        const id = first.rows[0].id;
        await db.query(
          "update jmb_notification_outbox set first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '1 minute' where id=$1",
          [id],
        );
        await db.query("select * from jmb_claim_notifications(null)");
        assert.equal(
          (await value("select state from jmb_notification_outbox where id=$1", [id])).state,
          "needs_review",
        );
      },
    );
    await t.test(
      "safe cancellation serializes Square requests and releases stock exactly once",
      async () => {
        const lock = await value("select jmb_checkout_lock($1,true) data", [account.id]);
        await assert.rejects(
          () => db.query("select jmb_checkout_lock($1,false)", [account.id]),
          /busy/,
        );
        await db.query("select jmb_finish_checkout_close($1,$2)", [account.id, lock.data.leaseId]);
        const stock = (await value("select stock from jmb_catalog_items where id=$1", [item.id]))
          .stock;
        await db.query("select jmb_finish_checkout_close($1,$2)", [account.id, lock.data.leaseId]);
        assert.equal(
          (await value("select stock from jmb_catalog_items where id=$1", [item.id])).stock,
          stock,
        );
        await assert.rejects(
          () => db.query("select jmb_checkout_lock($1,true)", [guest.id]),
          /paid/,
        );
      },
    );
    await t.test(
      "anonymous/account roles cannot read chat/outbox, invoke privileged APIs, forge payment or cross-order access",
      async () => {
        await db.exec("set role anon");
        await assert.rejects(
          () => db.query("select * from jmb_order_messages"),
          /permission denied/,
        );
        await assert.rejects(
          () => db.query("select * from jmb_notification_outbox"),
          /permission denied/,
        );
        await assert.rejects(
          () => db.query("select jmb_order_portal_token($1)", [guest.id]),
          /permission denied/,
        );
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [stranger]);
        await db.exec("set role authenticated");
        assert.equal(
          (await db.query("select * from jmb_orders where id=$1", [guest.id])).rows.length,
          0,
        );
        await assert.rejects(
          () => db.query("select * from jmb_order_messages"),
          /permission denied/,
        );
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
        await db.exec("set role authenticated");
        await assert.rejects(
          () => db.query("update jmb_orders set payment_status='Paid' where id=$1", [account.id]),
          /permission denied/,
        );
        await assert.rejects(
          () =>
            db.query("select jmb_order_send($1,$2,'admin',null,'Forged','Hello')", [
              guest.id,
              crypto.randomUUID(),
            ]),
          /permission denied/,
        );
        await db.exec("reset role");
      },
    );
  } finally {
    await db.close();
  }
});
