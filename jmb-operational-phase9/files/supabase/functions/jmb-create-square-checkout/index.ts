import { adminClient, corsHeaders, getOptionalUser, json, sha256Hex, siteUrl } from "../_shared/jmb.ts";

type Input = { orderId?: string; guestToken?: string; returnOrigin?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json() as Input;
    const orderId = String(input.orderId || "").trim();
    if (!orderId) return json({ error: "Order ID is required." }, 400);

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");
    if (!accessToken || !locationId) return json({ error: "Square checkout is not configured yet." }, 503);

    const client = adminClient();
    const { data: order, error: orderError } = await client.from("jmb_orders").select("*").eq("id", orderId).maybeSingle();
    if (orderError || !order) return json({ error: "Order not found." }, 404);

    const user = await getOptionalUser(req);
    let allowed = Boolean(user && order.customer_user_id && user.id === order.customer_user_id);
    if (!allowed && input.guestToken && order.guest_token_hash) {
      allowed = (await sha256Hex(input.guestToken)) === order.guest_token_hash;
    }
    if (!allowed) return json({ error: "This private order link is invalid or expired." }, 403);
    if (order.payment_status === "Paid") return json({ error: "This order is already paid." }, 400);

    const code = `JMB-${String(order.order_number).padStart(4, "0")}`;
    let returnOrigin = siteUrl();
    if (input.returnOrigin) {
      try {
        const candidate = new URL(input.returnOrigin);
        const stable = new URL(siteUrl());
        const allowed = candidate.origin === stable.origin || candidate.hostname.endsWith(".app.github.dev") || candidate.hostname === "localhost" || candidate.hostname === "127.0.0.1";
        if (allowed) returnOrigin = candidate.origin;
      } catch { /* use stable SITE_URL */ }
    }
    const amount = Math.max(1, Math.round(Number(order.total) * 100));
    const squareResponse = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
      method: "POST",
      headers: {
        "Square-Version": "2026-07-15",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        description: `JMB 2 Creations ${code}`,
        quick_pay: {
          name: `JMB 2 Creations ${code}`,
          price_money: { amount, currency: "USD" },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url: `${returnOrigin}/payment/${order.id}?square=return`,
          ask_for_shipping_address: false,
        },
        pre_populated_data: { buyer_email: order.customer_email },
        payment_note: `${code} • ${order.first_name} ${order.last_name}`,
      }),
    });

    if (!squareResponse.ok) return json({ error: `Square checkout error: ${await squareResponse.text()}` }, 502);
    const square = await squareResponse.json();
    const link = square.payment_link;
    if (!link?.url || !link?.order_id) return json({ error: "Square did not return a payment link." }, 502);

    const { data: updated, error: updateError } = await client.from("jmb_orders")
      .update({
        payment_method: "Square",
        square_payment_link_id: link.id || null,
        square_order_id: link.order_id,
      })
      .eq("id", order.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    return json({ url: link.url, order: updated });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
