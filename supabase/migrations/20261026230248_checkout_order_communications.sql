-- Apply only after verifying the live schema against phases 4 and 9.
-- No historical orders, timestamps, chats or payments are rewritten or emailed.
create schema if not exists jmb_private;
revoke all on schema jmb_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;

alter table public.jmb_orders add column if not exists checkout_version integer not null default 1;
alter table public.jmb_orders alter column checkout_version set default 2;
alter table public.jmb_orders add column if not exists checkout_key uuid;
alter table public.jmb_orders add column if not exists checkout_fingerprint text;
alter table public.jmb_orders add column if not exists payment_confirmed_at timestamptz;
alter table public.jmb_orders add column if not exists admin_seen_at timestamptz;
alter table public.jmb_orders add column if not exists square_payment_url text;
alter table public.jmb_orders add column if not exists checkout_closed_at timestamptz;
alter table public.jmb_orders add column if not exists stock_released_at timestamptz;
alter table public.jmb_order_items add column stock_reserved boolean not null default false;
create unique index jmb_orders_checkout_key on public.jmb_orders(checkout_key) where checkout_key is not null;
alter table public.jmb_orders drop constraint jmb_orders_status_check;
alter table public.jmb_orders add constraint jmb_orders_status_check check (status in ('Pending Checkout','Order Received','Payment Confirmed','In Production','Ready for Pickup','Shipped','Completed','Cancelled'));
alter table public.jmb_orders alter column status set default 'Pending Checkout';

-- Retire the old signature so outdated clients cannot create confirmed-looking orders.
revoke all on function public.jmb_create_storefront_order(uuid,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,jsonb) from public,anon,authenticated,service_role;
create or replace function public.jmb_create_storefront_order(
  p_customer_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_customer_email text,
  p_guest_token_hash text,
  p_fulfillment text,
  p_address1 text,
  p_address2 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text,
  p_shipping_amount numeric,
  p_easypost_shipment_id text,
  p_easypost_rate_id text,
  p_items jsonb,
  p_checkout_key uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_entry jsonb;
  v_item public.jmb_catalog_items%rowtype;
  v_qty integer;
  v_existing public.jmb_orders;
  v_fingerprint text;
begin
  if p_checkout_key is null then raise exception 'Checkout request ID is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_checkout_key::text,0));
  v_fingerprint := encode(extensions.digest(jsonb_build_array(p_customer_user_id,p_first_name,p_last_name,p_customer_email,p_guest_token_hash,p_fulfillment,p_address1,p_address2,p_city,p_state,p_postal_code,p_country,p_shipping_amount,p_easypost_shipment_id,p_easypost_rate_id,p_items)::text,'sha256'),'hex');
  select * into v_existing from public.jmb_orders where checkout_key=p_checkout_key;
  if found then
    if v_existing.checkout_fingerprint is distinct from v_fingerprint then raise exception 'Checkout request has changed. Start a new checkout.'; end if;
    return v_existing.id;
  end if;
  if p_fulfillment not in ('Shipping','Local Pickup') then raise exception 'Invalid fulfillment method'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Order has no items'; end if;

  -- Validate and lock every item before anything is inserted.
  for v_entry in select value from jsonb_array_elements(p_items) order by value->>'catalog_item_id'
  loop
    v_qty := (v_entry->>'quantity')::integer;
    if v_qty is null or v_qty not between 1 and 100 then raise exception 'Invalid quantity'; end if;
    select * into v_item from public.jmb_catalog_items
    where id = (v_entry->>'catalog_item_id')::uuid and active = true
    for update;
    if not found then raise exception 'A catalog item is no longer available'; end if;
    if not v_item.made_to_order and v_item.stock < v_qty then raise exception '% does not have enough ready stock', v_item.name; end if;
    v_subtotal := v_subtotal + (v_item.price * v_qty);
  end loop;

  if v_subtotal <= 0 then raise exception 'Checkout total must be positive'; end if;
  if p_fulfillment='Local Pickup' then p_shipping_amount := 0; end if;
  insert into public.jmb_orders(
    customer_user_id, first_name, last_name, customer_email, guest_token_hash,
    fulfillment, address1, address2, city, state, postal_code, country,
    subtotal, shipping_amount, tax_amount, discount_amount, total,
    status, payment_status, easypost_shipment_id, easypost_rate_id, checkout_version, checkout_key, checkout_fingerprint
  ) values (
    p_customer_user_id, trim(p_first_name), trim(p_last_name), lower(trim(p_customer_email)), p_guest_token_hash,
    p_fulfillment, p_address1, p_address2, p_city, p_state, p_postal_code, coalesce(p_country,'US'),
    v_subtotal, greatest(0,coalesce(p_shipping_amount,0)), 0, 0, v_subtotal + greatest(0,coalesce(p_shipping_amount,0)),
    'Pending Checkout', 'Unpaid', p_easypost_shipment_id, p_easypost_rate_id, 2, p_checkout_key, v_fingerprint
  ) returning id into v_order_id;

  for v_entry in select value from jsonb_array_elements(p_items) order by value->>'catalog_item_id'
  loop
    v_qty := (v_entry->>'quantity')::integer;
    if v_qty is null or v_qty not between 1 and 100 then raise exception 'Invalid quantity'; end if;
    select * into v_item from public.jmb_catalog_items where id = (v_entry->>'catalog_item_id')::uuid;
    insert into public.jmb_order_items(order_id, catalog_item_id, name, option, team, quantity, unit_price, line_total, image_url, stock_reserved)
    values (v_order_id, v_item.id, v_item.name, v_item.size, v_item.team, v_qty, v_item.price, v_item.price * v_qty, v_item.image_url, not v_item.made_to_order);
    if not v_item.made_to_order then
      update public.jmb_catalog_items set stock = stock - v_qty where id = v_item.id and stock >= v_qty;
      if not found then raise exception 'Not enough stock available'; end if;
    end if;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.jmb_create_storefront_order(uuid,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.jmb_create_storefront_order(uuid,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,jsonb,uuid) to service_role;

create table public.jmb_order_messages (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.jmb_orders(id),
 sender text not null check(sender in ('admin','customer')), sender_user_id uuid references auth.users(id) on delete set null,
 sender_name text not null, body text not null check(char_length(btrim(body)) between 1 and 4000),
 request_id uuid not null, created_at timestamptz not null default now(),
 admin_seen_at timestamptz, customer_seen_at timestamptz, unique(order_id,request_id)
);
create index jmb_order_messages_thread on public.jmb_order_messages(order_id,created_at,id);
create index jmb_order_messages_unread on public.jmb_order_messages(order_id) where sender='customer' and admin_seen_at is null;
create table public.jmb_notification_outbox (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.jmb_orders(id),
 event_key text not null unique, kind text not null check(kind in ('paid_admin','paid_customer','chat_admin','chat_customer','admin_email')),
 message_id uuid references public.jmb_order_messages(id), actor_user_id uuid references auth.users(id) on delete set null,
 subject text, body text, state text not null default 'pending' check(state in ('pending','sending','sent','needs_review')),
 attempts integer not null default 0, first_attempt_at timestamptz, next_attempt_at timestamptz not null default now(),
 lease_id uuid, lease_until timestamptz, payload jsonb, provider_id text, last_error text,
 created_at timestamptz not null default now(), sent_at timestamptz
);
create index jmb_notification_due on public.jmb_notification_outbox(next_attempt_at) where state in ('pending','sending');
create index jmb_notification_order on public.jmb_notification_outbox(order_id,created_at);
create index jmb_notification_message on public.jmb_notification_outbox(message_id);
create index jmb_notification_actor on public.jmb_notification_outbox(actor_user_id);
create index jmb_messages_actor on public.jmb_order_messages(sender_user_id);
alter table public.jmb_order_messages enable row level security;
alter table public.jmb_notification_outbox enable row level security;
revoke all on public.jmb_order_messages, public.jmb_notification_outbox from public,anon,authenticated;
grant all on public.jmb_order_messages, public.jmb_notification_outbox to service_role;

-- Supplemental guest links preserve original hashes and existing URLs.
create table jmb_private.order_tokens (
 order_id uuid primary key references public.jmb_orders(id), encrypted_token bytea not null, token_hash text not null
);
alter table jmb_private.order_tokens enable row level security;
revoke all on jmb_private.order_tokens from public,anon,authenticated;
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'jmb_order_link_key');
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'jmb_notification_worker_key');

create function public.jmb_order_portal_token(p_order_id uuid) returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_token text; v_key text;
begin
 perform 1 from public.jmb_orders where id=p_order_id and customer_user_id is null and guest_token_hash is not null for update;
 if not found then raise exception 'Guest order unavailable'; end if;
 select decrypted_secret into strict v_key from vault.decrypted_secrets where name='jmb_order_link_key';
 select extensions.pgp_sym_decrypt(encrypted_token,v_key) into v_token from jmb_private.order_tokens where order_id=p_order_id;
 if v_token is not null then return v_token; end if;
 v_token := encode(extensions.gen_random_bytes(32),'hex');
 insert into jmb_private.order_tokens values(p_order_id,extensions.pgp_sym_encrypt(v_token,v_key,'cipher-algo=aes256'),encode(extensions.digest(v_token,'sha256'),'hex'));
 return v_token;
end $$;
create function public.jmb_valid_guest_order(p_order_id uuid,p_token text) returns boolean language sql security definer set search_path=pg_catalog,pg_temp as $$
 select char_length(p_token) between 32 and 256 and exists(select 1 from public.jmb_orders o where o.id=p_order_id and o.customer_user_id is null and
  (o.guest_token_hash=encode(extensions.digest(p_token,'sha256'),'hex') or exists(select 1 from jmb_private.order_tokens t where t.order_id=o.id and t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex'))))
$$;
create function public.jmb_notification_worker_authorized(p_key text) returns boolean language sql security definer set search_path=pg_catalog,pg_temp as $$
 select char_length(p_key)=64 and exists(select 1 from vault.decrypted_secrets where name='jmb_notification_worker_key' and decrypted_secret=p_key)
$$;

-- Atomic payment -> two durable notifications. No historical backfill.
create function jmb_private.paid_order_notifications() returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if new.payment_method='Square' and new.payment_status='Paid' and old.payment_status is distinct from 'Paid' then
   new.payment_confirmed_at := coalesce(new.payment_confirmed_at,now());
   insert into public.jmb_notification_outbox(order_id,event_key,kind) values
     (new.id,'paid-admin:'||new.id,'paid_admin'),(new.id,'paid-customer:'||new.id,'paid_customer') on conflict(event_key) do nothing;
 end if;
 return new;
end $$;
create trigger jmb_paid_notifications before update of payment_status on public.jmb_orders for each row execute function jmb_private.paid_order_notifications();

-- Browser admins cannot forge Square payment fields or fulfill unpaid orders.
create function jmb_private.guard_order_payment() returns trigger language plpgsql set search_path=pg_catalog,pg_temp as $$
begin
 if current_user in ('authenticated','anon') and (new.checkout_version=2 or old.checkout_version=2) and
   (new.payment_status is distinct from old.payment_status or new.square_payment_id is distinct from old.square_payment_id or
    new.payment_confirmed_at is distinct from old.payment_confirmed_at or new.total is distinct from old.total or
    new.checkout_version is distinct from old.checkout_version or new.square_order_id is distinct from old.square_order_id or
    new.guest_token_hash is distinct from old.guest_token_hash or new.customer_user_id is distinct from old.customer_user_id or
    new.checkout_closed_at is distinct from old.checkout_closed_at or new.stock_released_at is distinct from old.stock_released_at) then
   raise exception 'Storefront payments must be verified by Square';
 end if;
 if new.status in ('Payment Confirmed','In Production','Ready for Pickup','Shipped','Completed') and new.payment_status<>'Paid' then
   if new.status is distinct from old.status then raise exception 'Payment is required before fulfillment'; end if;
 end if;
 if new.checkout_version=2 and new.payment_status<>'Paid' and new.status='Order Received' then raise exception 'Checkout is awaiting payment'; end if;
 if new.checkout_version=2 and new.status='Cancelled' and old.status<>'Cancelled' and new.stock_released_at is null then
   raise exception 'Close Square checkout before cancelling';
 end if;
 return new;
end $$;
create trigger jmb_guard_payment before update on public.jmb_orders for each row execute function jmb_private.guard_order_payment();

create function public.jmb_confirm_square_payment(p_square_order_id text,p_payment_id text,p_amount bigint,p_currency text,p_paid_at timestamptz)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare o public.jmb_orders;
begin
 select * into o from public.jmb_orders where square_order_id=p_square_order_id for update;
 if not found then return null; end if;
 if p_currency<>'USD' or p_amount<>round(o.total*100)::bigint then raise exception 'Square payment amount or currency mismatch'; end if;
 if o.payment_status='Paid' then
   if o.square_payment_id is distinct from p_payment_id then raise exception 'Additional payment requires reconciliation'; end if;
   return o.id;
 end if;
 if o.payment_status='Refunded' or o.status='Cancelled' or o.stock_released_at is not null then raise exception 'Closed order payment requires reconciliation'; end if;
 update public.jmb_orders set payment_method='Square', payment_status='Paid', square_payment_id=p_payment_id,
 payment_submitted_at=coalesce(payment_submitted_at,p_paid_at),payment_confirmed_at=coalesce(payment_confirmed_at,p_paid_at),
 status=case when status in ('Pending Checkout','Order Received') then 'Payment Confirmed' else status end where id=o.id;
 return o.id;
end $$;

create function public.jmb_order_send(p_order_id uuid,p_request_id uuid,p_sender text,p_user_id uuid,p_sender_name text,p_body text)
returns public.jmb_order_messages language plpgsql security invoker set search_path=public,pg_temp as $$
declare m public.jmb_order_messages;
begin
 perform 1 from public.jmb_orders where id=p_order_id for update;
 if not found then raise exception 'Order unavailable'; end if;
 select * into m from public.jmb_order_messages where order_id=p_order_id and request_id=p_request_id;
 if found then
  if m.sender<>p_sender or m.sender_user_id is distinct from p_user_id or m.body<>p_body then raise exception 'Request ID already used with a different message'; end if;
  return m;
 end if;
 if (select count(*) from public.jmb_order_messages where order_id=p_order_id and sender=p_sender and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many messages. Wait a minute.'; end if;
 insert into public.jmb_order_messages(order_id,request_id,sender,sender_user_id,sender_name,body,admin_seen_at,customer_seen_at)
 values(p_order_id,p_request_id,p_sender,p_user_id,p_sender_name,p_body,case when p_sender='admin' then now() end,case when p_sender='customer' then now() end) returning * into m;
 insert into public.jmb_notification_outbox(order_id,event_key,kind,message_id)
 values(p_order_id,'chat:'||m.id,case when p_sender='admin' then 'chat_customer' else 'chat_admin' end,m.id);
 return m;
end $$;

create function public.jmb_order_email(p_order_id uuid,p_request_id uuid,p_user_id uuid,p_subject text,p_body text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.jmb_notification_outbox; v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,1));
 if not exists(select 1 from public.jmb_admins where user_id=p_user_id) then raise exception 'Admin required'; end if;
 select * into j from public.jmb_notification_outbox where event_key='email:'||p_order_id||':'||p_request_id;
 if found then
   if j.actor_user_id is distinct from p_user_id or j.subject<>p_subject or j.body<>p_body then raise exception 'Request ID already used'; end if;
   return j.id;
 end if;
 if char_length(btrim(p_subject)) not between 1 and 150 or char_length(btrim(p_body)) not between 1 and 10000 then raise exception 'Invalid email'; end if;
 if (select count(*) from public.jmb_notification_outbox where actor_user_id=p_user_id and kind='admin_email' and created_at>now()-interval '1 hour')>=30 then raise exception 'Too many emails. Try later.'; end if;
 insert into public.jmb_notification_outbox(order_id,event_key,kind,actor_user_id,subject,body)
 values(p_order_id,'email:'||p_order_id||':'||p_request_id,'admin_email',p_user_id,p_subject,p_body) returning id into v_id;
 return v_id;
end $$;

create function public.jmb_claim_notifications(p_order_id uuid default null) returns setof public.jmb_notification_outbox
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.jmb_notification_outbox set state='needs_review',last_error='Idempotency window exceeded; reconcile with Resend before resending'
 where state in ('pending','sending') and first_attempt_at<now()-interval '23 hours' and (lease_until is null or lease_until<now());
 return query with jobs as (
 select id from public.jmb_notification_outbox where state in ('pending','sending') and next_attempt_at<=now()
 and (lease_until is null or lease_until<now()) and (p_order_id is null or order_id=p_order_id)
 order by created_at for update skip locked limit 5
 ) update public.jmb_notification_outbox n set state='sending',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=n.attempts+1
 from jobs where n.id=jobs.id returning n.*;
end $$;

-- Every privileged API is service-role only. RLS exposes no chat/outbox/token rows.
revoke all on function public.jmb_order_portal_token(uuid),public.jmb_valid_guest_order(uuid,text),public.jmb_notification_worker_authorized(text),public.jmb_confirm_square_payment(text,text,bigint,text,timestamptz),public.jmb_order_send(uuid,uuid,text,uuid,text,text),public.jmb_order_email(uuid,uuid,uuid,text,text),public.jmb_claim_notifications(uuid) from public,anon,authenticated;
grant execute on function public.jmb_order_portal_token(uuid),public.jmb_valid_guest_order(uuid,text),public.jmb_notification_worker_authorized(text),public.jmb_confirm_square_payment(text,text,bigint,text,timestamptz),public.jmb_order_send(uuid,uuid,text,uuid,text,text),public.jmb_order_email(uuid,uuid,uuid,text,text),public.jmb_claim_notifications(uuid) to service_role;
revoke all on function jmb_private.paid_order_notifications(),jmb_private.guard_order_payment() from public,anon,authenticated;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('jmb-order-notifications','* * * * *',$cron$
 select net.http_post(url:='https://jtrgjlnuoduhxwfqsgap.supabase.co/functions/v1/jmb-order-communications',
 headers:=jsonb_build_object('Content-Type','application/json','x-jmb-worker',(select decrypted_secret from vault.decrypted_secrets where name='jmb_notification_worker_key')),
 body:='{"action":"worker"}'::jsonb,timeout_milliseconds:=60000)
 where exists(select 1 from public.jmb_notification_outbox where state in ('pending','sending') and next_attempt_at<=now());
$cron$);

-- Limit direct admin mutations to operational fields; payment and identity fields use authenticated server endpoints.
revoke update on public.jmb_orders from authenticated;
grant update(status,tracking_code,tracking_carrier,tracking_status) on public.jmb_orders to authenticated;

-- Serialize external checkout creation/cancellation. A lost response is retried
-- with the same Square idempotency key; stock is released only after confirmed closure.
alter table public.jmb_orders add column checkout_lease_id uuid;
alter table public.jmb_orders add column checkout_lease_until timestamptz;
create function public.jmb_checkout_lock(p_order_id uuid,p_close boolean default false) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare o public.jmb_orders; v_lease uuid := gen_random_uuid();
begin
 select * into o from public.jmb_orders where id=p_order_id for update;
 if not found or o.payment_status in ('Paid','Refunded') then raise exception 'Checkout is closed or paid'; end if;
 if o.checkout_lease_until>now() then raise exception 'Checkout is busy. Retry shortly.'; end if;
 if not p_close and (o.checkout_closed_at is not null or o.status='Cancelled') then raise exception 'Checkout is closed'; end if;
 if p_close and o.checkout_version<>2 then raise exception 'Historical checkout must be reviewed separately'; end if;
 update public.jmb_orders set checkout_lease_id=v_lease,checkout_lease_until=now()+interval '2 minutes',
 checkout_closed_at=case when p_close then coalesce(checkout_closed_at,now()) else checkout_closed_at end where id=o.id;
 return jsonb_build_object('leaseId',v_lease,'order',to_jsonb(o));
end $$;
create function public.jmb_finish_checkout_close(p_order_id uuid,p_lease_id uuid) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare o public.jmb_orders;
begin
 select * into o from public.jmb_orders where id=p_order_id for update;
 if not found or o.checkout_lease_id is distinct from p_lease_id or o.checkout_closed_at is null or o.payment_status in ('Paid','Refunded') or o.checkout_version<>2 then raise exception 'Checkout closure requires review'; end if;
 if o.stock_released_at is null then
  -- Lock stock in a stable order to avoid deadlocks with checkout creation.
  perform 1 from public.jmb_catalog_items c where c.id in (select catalog_item_id from public.jmb_order_items where order_id=o.id) order by c.id for update;
  update public.jmb_catalog_items c set stock=c.stock+x.qty from
   (select catalog_item_id,sum(quantity)::integer qty from public.jmb_order_items where order_id=o.id and stock_reserved=true group by catalog_item_id) x
  where c.id=x.catalog_item_id;
 end if;
 update public.jmb_orders set status='Cancelled',stock_released_at=coalesce(stock_released_at,now()),checkout_lease_until=null where id=o.id;
end $$;
revoke all on function public.jmb_checkout_lock(uuid,boolean),public.jmb_finish_checkout_close(uuid,uuid) from public,anon,authenticated;
grant execute on function public.jmb_checkout_lock(uuid,boolean),public.jmb_finish_checkout_close(uuid,uuid) to service_role;
