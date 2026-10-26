import { adminClient, corsHeaders, getOptionalUser, json, sha256Hex, shippoHeaders, siteUrl } from "../_shared/jmb.ts";

import { UUID } from "../_shared/order-logic.ts";
import { safeOrder } from "../_shared/order-access.ts";

type Input = {
  checkoutKey?: string; guestToken?: string;
  firstName?: string; lastName?: string; email?: string; fulfillment?: "Shipping" | "Local Pickup";
  address?: { address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  shipmentId?: string; rateId?: string;
  items?: Array<{ catalogItemId?: string; quantity?: number }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 48000) return json({ error: "Checkout request too large." }, 413);
    const input = JSON.parse(raw) as Input;
    if (!input.checkoutKey || !UUID.test(input.checkoutKey)) return json({ error: "Checkout request ID is required." }, 400);
    if (!input.guestToken || !/^[0-9a-f]{64}$/.test(input.guestToken)) return json({ error: "Checkout recovery token is required." }, 400);
    const firstName = String(input.firstName || "").trim(); const lastName = String(input.lastName || "").trim(); let email = String(input.email || "").trim().toLowerCase();
    if (!firstName || !lastName || !email.includes("@")) return json({ error: "First name, last name and a valid email are required." }, 400);
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) return json({ error: "Your cart is empty." }, 400);
    if (input.fulfillment !== "Shipping" && input.fulfillment !== "Local Pickup") return json({ error: "Choose shipping or local pickup." }, 400);

    const candidate = await getOptionalUser(req);
    const user = candidate && !candidate.is_anonymous ? candidate : null;
    if (user?.email) email = user.email.toLowerCase();
    let guestToken: string | undefined;
    let guestHash: string | null = null;
    if (!user) { guestToken = input.guestToken; guestHash = await sha256Hex(guestToken); }

    let shippingAmount = 0;
    if (input.fulfillment === "Shipping") {
      if (!input.address?.address1 || !input.address.city || !input.address.state || !input.address.postalCode || !input.shipmentId || !input.rateId) return json({ error: "A valid shipping address and selected carrier rate are required." }, 400);
      const shipmentResponse = await fetch(`https://api.goshippo.com/shipments/${encodeURIComponent(input.shipmentId)}`, { headers: shippoHeaders() });
      if (!shipmentResponse.ok) return json({ error: "Could not verify the selected shipping rate." }, 400);
      const shipment = await shipmentResponse.json();
      const rate = (shipment.rates ?? []).find((item: any) => item.object_id === input.rateId);
      if (!rate) return json({ error: "The selected shipping rate is no longer valid." }, 400);
      if (rate.currency !== "USD" || !Number.isFinite(Number(rate.amount)) || Number(rate.amount) < 0) return json({ error: "Invalid shipping rate." }, 400);
      const to = shipment.address_to;
      if (!to || String(to.zip).replace(/\s/g, "").slice(0, 5) !== String(input.address.postalCode).replace(/\s/g, "").slice(0, 5) || String(to.state).toUpperCase() !== input.address.state.toUpperCase() || (to.country && to.country !== "US")) return json({ error: "Shipping address changed; calculate shipping again." }, 400);
      shippingAmount = Number(rate.amount);
    }

    const client = adminClient();
    if (input.items.some(item => !item.catalogItemId || !UUID.test(item.catalogItemId) || !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 100)) return json({ error: "Invalid cart quantities." }, 400);
    const rpcItems = input.items.map((item) => ({ catalog_item_id: item.catalogItemId, quantity: item.quantity }));
    const { data: orderId, error: createError } = await client.rpc("jmb_create_storefront_order", {
      p_customer_user_id: user?.id ?? null,
      p_first_name: firstName,
      p_last_name: lastName,
      p_customer_email: email,
      p_guest_token_hash: guestHash,
      p_fulfillment: input.fulfillment,
      p_address1: input.fulfillment === "Shipping" ? input.address?.address1 ?? null : null,
      p_address2: input.fulfillment === "Shipping" ? input.address?.address2 ?? null : null,
      p_city: input.fulfillment === "Shipping" ? input.address?.city ?? null : null,
      p_state: input.fulfillment === "Shipping" ? input.address?.state ?? null : null,
      p_postal_code: input.fulfillment === "Shipping" ? input.address?.postalCode ?? null : null,
      p_country: input.fulfillment === "Shipping" ? input.address?.country || "US" : null,
      p_shipping_amount: shippingAmount,
      // Legacy RPC parameter names are retained so the production schema does not need a risky rewrite.
      // These fields now store Shippo shipment/rate object IDs for newly created orders.
      p_easypost_shipment_id: input.fulfillment === "Shipping" ? input.shipmentId : null,
      p_easypost_rate_id: input.fulfillment === "Shipping" ? input.rateId : null,
      p_items: rpcItems,
      p_checkout_key: input.checkoutKey,
    });
    if (createError || !orderId) return json({ error: createError?.message || "Could not create order." }, 400);
    const { data: order, error: orderError } = await client.from("jmb_orders").select("*").eq("id", orderId).single();
    if (orderError || !order) throw new Error("Could not load pending checkout. Retry in this browser.");
    const accessUrl = guestToken ? `${siteUrl()}/guest/order/${order.id}?token=${encodeURIComponent(guestToken)}` : undefined;
    // This is a recoverable checkout, not a confirmed order. No confirmation email yet.
    return json({ order: safeOrder(order), guestToken, accessUrl, emailSent: false });
  } catch { return json({ error: "Could not prepare checkout. Retry in this browser." }, 500); }
});
