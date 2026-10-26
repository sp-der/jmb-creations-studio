import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier.startsWith("npm:") ? specifier.slice(4).replace(/@\d[^/]*$/, "") : specifier,
      context,
    );
  },
});
const env = new Map(
  Object.entries({
    SUPABASE_URL: "https://db.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-service-key",
    SQUARE_ACCESS_TOKEN: "test-only-square-key",
    SQUARE_LOCATION_ID: "location",
    SQUARE_WEBHOOK_SIGNATURE_KEY: "test-only-signature",
    SQUARE_WEBHOOK_NOTIFICATION_URL: "https://example.test/webhook",
    RESEND_API_KEY: "test-only-resend",
    JMB_FROM_EMAIL: "JMB <sender@example.test>",
    JMB_NOTIFICATION_EMAIL: "business@example.test",
  }),
);
globalThis.Deno = { serve: () => {}, env: { get: (key) => env.get(key) } };
const { handler } = await import("../supabase/functions/jmb-order-communications/index.ts");
const { squareWebhook } = await import("../supabase/functions/_shared/square-webhook.ts");
const { drainNotifications } = await import("../supabase/functions/_shared/order-notifications.ts");
const { adminClient } = await import("../supabase/functions/_shared/jmb.ts");
const orderId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const order = {
  id: orderId,
  customer_user_id: ownerId,
  first_name: "Test",
  last_name: "Customer",
  total: 25,
  square_order_id: "square-order",
};
const originalFetch = globalThis.fetch;
const json = (data) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
const request = (body, authorization) =>
  new Request("https://example.test/communications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
    body: JSON.stringify(body),
  });
function apiMock({
  user = ownerId,
  admin = false,
  guest = false,
  onRpc = () => {},
  onFetch = () => null,
} = {}) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const response = onFetch(url, init);
    if (response) return response;
    if (url.pathname === "/auth/v1/user")
      return json({ id: user, aud: "authenticated", role: "authenticated", is_anonymous: false });
    if (url.pathname.endsWith("/jmb_admins")) return json(admin ? [{ user_id: user }] : []);
    if (url.pathname.endsWith("/jmb_orders")) return json([order]);
    if (url.pathname.endsWith("/rpc/jmb_valid_guest_order")) return json(guest);
    if (url.pathname.includes("/rpc/")) {
      const body = JSON.parse(init.body || "{}");
      onRpc(url.pathname, body);
      if (url.pathname.endsWith("jmb_order_send")) return json({ id: "message" });
      if (url.pathname.endsWith("jmb_claim_notifications")) return json([]);
      return json(orderId);
    }
    throw new Error(`Unexpected mock request ${url.pathname}`);
  };
}
test("guest mismatch, cross-account, spoofed sender, admin email authorization and worker gate", async () => {
  try {
    globalThis.fetch = apiMock({ user: otherId });
    assert.equal(
      (await handler(request({ action: "list", orderId }, "other-account"))).status,
      403,
    );
    globalThis.fetch = apiMock({ user: otherId, guest: false });
    assert.equal(
      (
        await handler(
          request({ action: "list", orderId, token: "invalid".repeat(10) }, "other-account"),
        )
      ).status,
      403,
    );
    let saved;
    globalThis.fetch = apiMock({
      onRpc: (path, body) => {
        if (path.endsWith("jmb_order_send")) saved = body;
      },
    });
    assert.equal(
      (
        await handler(
          request(
            {
              action: "send",
              orderId,
              requestId: crypto.randomUUID(),
              message: "Hello",
              sender: "admin",
              sender_name: "Forged",
            },
            "owner",
          ),
        )
      ).status,
      200,
    );
    assert.equal(saved.p_sender, "customer");
    assert.equal(saved.p_user_id, ownerId);
    assert.equal(saved.p_sender_name, "Test Customer");
    assert.equal(
      (
        await handler(
          request(
            {
              action: "email",
              orderId,
              subject: "x",
              message: "x",
              requestId: crypto.randomUUID(),
            },
            "owner",
          ),
        )
      ).status,
      403,
    );
    globalThis.fetch = apiMock({
      user: otherId,
      guest: true,
      onRpc: (path, body) => {
        if (path.endsWith("jmb_order_send")) saved = body;
      },
    });
    assert.equal(
      (
        await handler(
          request(
            {
              action: "send",
              orderId,
              token: "valid".repeat(16),
              requestId: crypto.randomUUID(),
              message: "Guest reply",
            },
            "unrelated-session",
          ),
        )
      ).status,
      200,
    );
    assert.equal(saved.p_sender, "customer");
    assert.equal(saved.p_user_id, null);
    globalThis.fetch = apiMock({
      admin: true,
      onRpc: (path, body) => {
        if (path.endsWith("jmb_order_email")) saved = body;
      },
    });
    assert.equal(
      (
        await handler(
          request(
            {
              action: "email",
              orderId,
              subject: "Subject",
              message: "Body",
              requestId: crypto.randomUUID(),
            },
            "admin",
          ),
        )
      ).status,
      200,
    );
    assert.equal(saved.p_user_id, ownerId);
    assert.equal(saved.p_subject, "Subject");
    assert.equal((await handler(request({ action: "worker" }))).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("Square handler verifies signature then fetches payment records; invalid currency/status cannot confirm", async () => {
  const sign = async (body) => {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.get("SQUARE_WEBHOOK_SIGNATURE_KEY")),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return Buffer.from(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(env.get("SQUARE_WEBHOOK_NOTIFICATION_URL") + body),
      ),
    ).toString("base64");
  };
  const event = {
    type: "payment.updated",
    data: { object: { payment: { id: "payment", order_id: "square-order", status: "COMPLETED" } } },
  };
  const raw = JSON.stringify(event);
  const call = async (signature) =>
    squareWebhook()(
      new Request("https://example.test/webhook", {
        method: "POST",
        headers: { "x-square-hmacsha256-signature": signature || (await sign(raw)) },
        body: raw,
      }),
    );
  let confirmed = 0;
  let currency = "USD";
  try {
    globalThis.fetch = apiMock({
      onRpc: (path) => {
        if (path.endsWith("jmb_confirm_square_payment")) confirmed++;
      },
      onFetch: (url) =>
        url.hostname === "connect.squareupsandbox.com"
          ? json({
              payment: {
                id: "payment",
                order_id: "square-order",
                status: "COMPLETED",
                location_id: "location",
                amount_money: { amount: 2500, currency },
              },
            })
          : null,
    });
    assert.equal((await call("invalid")).status, 403);
    assert.equal(confirmed, 0);
    assert.equal((await call()).status, 200);
    assert.equal(confirmed, 1);
    currency = "CAD";
    assert.equal((await call()).status, 500);
    assert.equal(confirmed, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("Resend outages preserve frozen payload and idempotency key, retries record acceptance, permanent errors require review", async () => {
  const payload = {
    from: "sender@example.test",
    to: ["receiver@example.test"],
    subject: "Test",
    html: "<p>Test</p>",
  };
  const job = {
    id: "44444444-4444-4444-8444-444444444444",
    order_id: orderId,
    kind: "paid_admin",
    lease_id: "55555555-5555-4555-8555-555555555555",
    attempts: 1,
    payload,
    first_attempt_at: null,
  };
  const attempts = [];
  const patches = [];
  let status = 503;
  try {
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      if (url.pathname.endsWith("jmb_claim_notifications")) return json([job]);
      if (url.hostname === "api.resend.com") {
        attempts.push({
          key: new Headers(init.headers).get("Idempotency-Key"),
          body: JSON.parse(init.body),
        });
        return status === 200
          ? json({ id: "provider-message" })
          : new Response("provider body must not leak", { status });
      }
      if (url.pathname.endsWith("jmb_notification_outbox")) {
        patches.push(JSON.parse(init.body));
        return json({ id: job.id });
      }
      throw new Error(`Unexpected ${url}`);
    };
    const client = adminClient();
    assert.equal((await drainNotifications(client))[0].state, "pending");
    assert.equal(patches.at(-1).state, "pending");
    assert.equal(patches.at(-1).last_error, "Resend HTTP 503");
    status = 200;
    assert.equal((await drainNotifications(client))[0].state, "sent");
    assert.equal(attempts[0].key, attempts[1].key);
    assert.deepEqual(attempts[0].body, attempts[1].body);
    assert.equal(patches.at(-1).provider_id, "provider-message");
    status = 422;
    assert.equal((await drainNotifications(client))[0].state, "needs_review");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
