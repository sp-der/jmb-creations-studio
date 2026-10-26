import { adminClient, corsHeaders, getOptionalUser, json, siteUrl } from "../_shared/jmb.ts";

import { orderAccess, safeOrder } from "../_shared/order-access.ts";

type Input = { orderId?: string; guestToken?: string; returnOrigin?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let leaseId = ""; let lockedOrderId = "";
  try {
    const input = await req.json() as Input;
    const orderId = String(input.orderId || "").trim();
    if (!orderId) return json({ error: "Order ID is required." }, 400);

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");
    if (!accessToken || !locationId) return json({ error: "Square checkout is not configured yet." }, 503);

    const access = await orderAccess(req, orderId, input.guestToken, false);
    if (!access) return json({ error: "Access denied." }, 403);
    const { client, order } = access;
    if (["Paid", "Refunded"].includes(order.payment_status) || order.status === "Cancelled" || order.checkout_closed_at) return json({ error: "This checkout is closed or already paid." }, 409);
    if (order.square_payment_url) return json({ url: order.square_payment_url, order: safeOrder(order) });

    const lock = await client.rpc("jmb_checkout_lock", { p_order_id: order.id, p_close: false });
    if (lock.error) return json({ error: "Checkout is busy or closed. Please refresh and retry." }, 409);
    leaseId = lock.data.leaseId; lockedOrderId = order.id;
    // Existing historical Square links are reused instead of overwriting their payment association.
    if (order.square_payment_link_id) {
      const base = Deno.env.get("SQUARE_ENVIRONMENT") === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
      const response = await fetch(`${base}/v2/online-checkout/payment-links/${encodeURIComponent(order.square_payment_link_id)}`, { headers: { Authorization: `Bearer ${accessToken}`, "Square-Version": "2026-07-15" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return json({ error: "Existing checkout requires JMB review. Please do not create another payment." }, 409);
      const link = (await response.json()).payment_link;
      if (!link?.url || link.order_id !== order.square_order_id) return json({ error: "Existing Square link could not be verified." }, 409);
      return json({ url: link.url, order: safeOrder(order) });
    }

    const code = `JMB-${String(order.order_number).padStart(4, "0")}`;
    const returnOrigin = "https://jmb2creations.com";
    const amount = Math.round(Number(order.total) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) return json({ error: "Invalid checkout total." }, 400);
    const squareEnvironment = (Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox").toLowerCase();
    const squareBaseUrl = squareEnvironment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
    const squareResponse = await fetch(`${squareBaseUrl}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Square-Version": "2026-07-15",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        idempotency_key: `jmb-checkout-${order.id}`,
        description: `JMB 2 Creations ${code}`,
        quick_pay: {
          name: `JMB 2 Creations ${code}`,
          price_money: { amount, currency: "USD" },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url: `${returnOrigin}/payment/${order.id}?square=return`,
          allow_tipping: false,
          ask_for_shipping_address: false,
        },
        pre_populated_data: { buyer_email: order.customer_email },
        payment_note: `${code} • ${order.first_name} ${order.last_name}`,
      }),
    });

    if (!squareResponse.ok) return json({ error: `Square checkout is temporarily unavailable (HTTP ${squareResponse.status}).` }, 502);
    const square = await squareResponse.json();
    const link = square.payment_link;
    if (!link?.url || !link?.order_id) return json({ error: "Square did not return a payment link." }, 502);

    const { data: updated, error: updateError } = await client.from("jmb_orders")
      .update({
        payment_method: "Square",
        square_payment_link_id: link.id || null,
        square_order_id: link.order_id,
        square_payment_url: link.url,
      })
      .eq("id", order.id).eq("checkout_lease_id", leaseId).is("checkout_closed_at", null)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    return json({ url: link.url, order: safeOrder(updated) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  } finally {
    if (leaseId) await adminClient().from("jmb_orders").update({ checkout_lease_until: null }).eq("id", lockedOrderId).eq("checkout_lease_id", leaseId);
  }
});
