import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  messageText,
  ownsOrder,
  portalLink,
  validPayment,
  verifySignature,
  retrySeconds,
} from "../supabase/functions/_shared/order-logic.ts";
const id = "11111111-1111-4111-8111-111111111111";
test("server ownership rejects anonymous users and wrong account", () => {
  assert.equal(ownsOrder({ id }, { customer_user_id: id }), true);
  assert.equal(ownsOrder({ id, is_anonymous: true }, { customer_user_id: id }), false);
  assert.equal(ownsOrder({ id: "other" }, { customer_user_id: id }), false);
  assert.equal(ownsOrder(null, { customer_user_id: null }), false);
});
test("message validation normalizes text and rejects empty, oversized and control text", () => {
  assert.equal(messageText(" hello\r\nworld "), "hello\nworld");
  for (const text of ["", "a".repeat(4001), "\u0000", null]) assert.throws(() => messageText(text));
  assert.ok(!escapeHtml('<img src=x onerror="alert(1)">').includes("<img"));
});
test("private notification URLs are canonical and encode guest tokens", () => {
  assert.equal(portalLink(id, true), `https://jmb2creations.com/orders/${id}`);
  assert.equal(
    portalLink(id, false, "a&x=1"),
    `https://jmb2creations.com/guest/order/${id}?token=a%26x%3D1`,
  );
  assert.throws(() => portalLink(id, false));
  assert.throws(() => portalLink("not-a-uuid", true));
});
test("only completed payments at configured location with matching order, currency and amount pass", () => {
  const p = {
    id: "payment",
    status: "COMPLETED",
    order_id: "square",
    location_id: "location",
    amount_money: { amount: 2500, currency: "USD" },
  };
  const o = { square_order_id: "square", total: 25 };
  assert.equal(validPayment(p, o, "location"), true);
  for (const patch of [
    { status: "PENDING" },
    { status: "CANCELED" },
    { status: "FAILED" },
    { location_id: "other" },
    { order_id: "other" },
    { amount_money: { amount: 2499, currency: "USD" } },
    { amount_money: { amount: 2500, currency: "CAD" } },
  ])
    assert.equal(validPayment({ ...p, ...patch }, o, "location"), false);
});
test("Square signature authenticates raw body and exact webhook URL; malformed signatures fail closed", async () => {
  const raw = '{"event":"test"}',
    url = "https://example.test/webhook",
    secret = "test-only";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Buffer.from(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(url + raw)),
  ).toString("base64");
  assert.equal(await verifySignature(raw, signature, secret, url), true);
  assert.equal(await verifySignature(raw + " ", signature, secret, url), false);
  assert.equal(await verifySignature(raw, signature, secret, url + "/"), false);
  assert.equal(await verifySignature(raw, "malformed!", secret, url), false);
  assert.equal(await verifySignature(raw, "", secret, url), false);
});
test("retry delays increase and stay bounded", () => {
  assert.equal(retrySeconds(1), 30);
  assert.equal(retrySeconds(20), 3600);
});
