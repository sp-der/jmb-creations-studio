// Local browser verification. All external HTTP requests are intercepted; no live mail or payments.
const server = require("node:child_process").spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "3002",
    "--mode",
    "production",
  ],
  {
    cwd: require("node:path").resolve(__dirname, ".."),
    stdio: [
      "ignore",
      require("node:fs").openSync("/tmp/jmb-browser-server.txt", "w"),
      require("node:fs").openSync("/tmp/jmb-browser-server-err.txt", "w"),
    ],
  },
);
process.on("exit", () => server.kill());
const assert = require("node:assert/strict");
const { chromium } = require(process.env.JMB_PLAYWRIGHT_MODULE || "playwright");
const bin = process.env.JMB_CHROMIUM_ARGS_MODULE
  ? require(process.env.JMB_CHROMIUM_ARGS_MODULE)
  : { args: ["--no-sandbox"] };
const id = "11111111-1111-4111-8111-111111111111",
  pendingId = "44444444-4444-4444-8444-444444444444",
  user = "22222222-2222-4222-8222-222222222222";
const paid = {
  id,
  order_number: 1001,
  customer_user_id: null,
  first_name: "Test",
  last_name: "Customer",
  customer_email: "customer@example.test",
  fulfillment: "Local Pickup",
  subtotal: 25,
  shipping_amount: 0,
  tax_amount: 0,
  discount_amount: 0,
  total: 25,
  status: "Payment Confirmed",
  payment_status: "Paid",
  payment_method: "Square",
  checkout_version: 2,
  created_at: "2026-10-26T18:00:00Z",
  payment_confirmed_at: "2026-10-26T18:05:00Z",
  payment_submitted_at: "2026-10-26T18:05:00Z",
};
const pending = {
  ...paid,
  id: pendingId,
  order_number: 1002,
  status: "Pending Checkout",
  payment_status: "Unpaid",
  payment_confirmed_at: null,
  payment_submitted_at: null,
};
const line = {
  id: "line",
  order_id: id,
  name: "Test Cup",
  quantity: 1,
  unit_price: 25,
  line_total: 25,
};
let messages = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    order_id: id,
    sender: "customer",
    sender_name: "Test Customer",
    body: "Can I collect this tomorrow?",
    created_at: "2026-10-26T18:10:00Z",
    admin_seen_at: null,
    customer_seen_at: "2026-10-26T18:10:00Z",
  },
];
let sentEmail = false,
  checkoutBody = null,
  squareCalls = 0,
  mode = "admin";
const errors = [];
(async () => {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:3002/");
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  const browser = await chromium.launch({
    ...(process.env.JMB_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.JMB_CHROMIUM_EXECUTABLE }
      : {}),
    args: bin.args,
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("https://**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.hostname.endsWith("supabase.co")) return route.fulfill({ status: 200, body: "" });
    let data = [];
    const body = route.request().postDataJSON();
    if (url.pathname.endsWith("/jmb_admins")) data = [{ user_id: user }];
    else if (url.pathname.endsWith("/jmb_orders"))
      data = mode === "account" ? [{ ...paid, customer_user_id: user }] : [paid, pending];
    else if (url.pathname.endsWith("/jmb_order_items")) data = [line];
    else if (url.pathname.endsWith("/jmb-guest-order-access"))
      data = { order: body.orderId === pendingId ? pending : paid, items: [line] };
    else if (url.pathname.endsWith("/jmb-create-order")) {
      checkoutBody = body;
      data = { order: pending, guestToken: body.guestToken };
    } else if (url.pathname.endsWith("/jmb-create-square-checkout")) {
      squareCalls++;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Controlled Square outage" }),
      });
    } else if (url.pathname.endsWith("/jmb-order-communications")) {
      if (body.action === "unread") data = { counts: { [id]: 1 }, newOrders: [id] };
      if (body.action === "list") data = { messages };
      if (body.action === "seen") data = { seen: true };
      if (body.action === "send") {
        messages = [
          ...messages,
          {
            id: body.requestId,
            order_id: id,
            sender: mode === "admin" ? "admin" : "customer",
            sender_name: mode === "admin" ? "JMB 2 Creations" : "Test Customer",
            body: body.message,
            created_at: new Date().toISOString(),
          },
        ];
        data = { saved: true };
      }
      if (body.action === "email") {
        sentEmail = true;
        data = { saved: true };
      }
      if (body.action === "notifications") data = { notifications: [] };
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem(
        "jmb-admin-supabase-session",
        JSON.stringify({
          access_token: "mock-admin",
          expires_at: 9999999999,
          user: { id: user, email: "admin@example.test" },
        }),
      );
    },
    { user },
  );
  await page.goto(`http://127.0.0.1:3002/admin?order=${id}`);
  await page.getByRole("heading", { name: "Order Conversation", exact: true }).waitFor();
  await page.getByText("Can I collect this tomorrow?", { exact: true }).waitFor();
  await page.getByText("Guest Checkout", { exact: true }).waitFor();
  assert.ok(await page.getByText(/Payment confirmed Oct/).count());
  await page.getByPlaceholder("Reply to customer…").fill("Yes, we will send pickup details.");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await page.getByText("Yes, we will send pickup details.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Email Customer", exact: true }).click();
  await page.getByLabel("Subject", { exact: true }).fill("Pickup details");
  await page.getByLabel("Message", { exact: true }).fill("Your pickup information.");
  await page.getByRole("button", { name: "Send Email", exact: true }).click();
  await page.getByText("Email saved to the delivery queue. Check its status below.").waitFor();
  assert.equal(sentEmail, true);
  await page.screenshot({ path: "/tmp/jmb-admin-desktop.png", fullPage: true });
  await page.getByRole("button", { name: /Customer Inbox/ }).click();
  await page.getByRole("button", { name: "Custom Requests", exact: true }).click();
  await page.getByRole("heading", { name: "Custom Chats", exact: true }).waitFor();
  await page.getByRole("button", { name: /Order Conversations/ }).click();
  await page.getByRole("button", { name: "Open Order", exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/jmb-inbox-mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  mode = "guest";
  await page.goto(`http://127.0.0.1:3002/guest/order/${id}?token=${"a".repeat(64)}`);
  await page.getByRole("heading", { name: "Order Conversation", exact: true }).waitFor();
  await page.getByPlaceholder("Message JMB…").fill("Thanks!");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await page.getByText("Thanks!", { exact: true }).waitFor();
  await page.screenshot({ path: "/tmp/jmb-guest-mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.goto(`http://127.0.0.1:3002/payment/${pendingId}?token=${"a".repeat(64)}`);
  await page.getByRole("heading", { name: "Complete Secure Payment", exact: true }).waitFor();
  assert.equal(await page.getByText("Zelle", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Venmo", { exact: true }).count(), 0);
  assert.equal(await page.getByText("PayPal", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Pay $25.00 with Square", exact: true }).click();
  await page.getByText("Controlled Square outage", { exact: true }).waitFor();
  mode = "account";
  await page.evaluate(
    ({ user }) =>
      localStorage.setItem(
        "jmb-customer-supabase-session",
        JSON.stringify({
          access_token: "mock-customer",
          expires_at: 9999999999,
          user: { id: user, email: "customer@example.test" },
        }),
      ),
    { user },
  );
  await page.goto(`http://127.0.0.1:3002/orders/${id}`);
  await page.getByRole("heading", { name: "Order Conversation", exact: true }).waitFor();
  mode = "guest";
  await page.evaluate(() => {
    localStorage.removeItem("jmb-customer-supabase-session");
    localStorage.setItem(
      "jmb-cart-v2",
      JSON.stringify([
        {
          productId: "55555555-5555-4555-8555-555555555555",
          name: "Test Cup",
          slug: "test",
          category: "cups",
          price: 25,
          quantity: 1,
        },
      ]),
    );
  });
  await page.goto("http://127.0.0.1:3002/checkout");
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("Last name", { exact: true }).fill("Customer");
  await page.getByLabel("Email", { exact: true }).fill("customer@example.test");
  await page.getByRole("button", { name: /Local Pickup/ }).click();
  await page.getByRole("button", { name: "Pay Securely with Square", exact: true }).click();
  await page.waitForURL(`**/payment/${pendingId}?token=*`);
  assert.equal(checkoutBody.fulfillment, "Local Pickup");
  assert.equal(checkoutBody.guestToken.length, 64);
  assert.equal(typeof checkoutBody.checkoutKey, "string");
  assert.ok(squareCalls >= 2);
  assert.ok(
    await page.evaluate(() => JSON.parse(localStorage.getItem("jmb-cart-v2")).length === 1),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: admin chat/email, inbox custom-history UI, guest/account portals, mobile overflow, Square-only checkout, pickup and interrupted-payment cart recovery (mock APIs).",
  );
  await browser.close();
  server.kill();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
