import { adminClient, corsHeaders, emailShell, getOptionalUser, json, makePrivateToken, money, sendEmail, sha256Hex, shippoHeaders, siteUrl } from "../_shared/jmb.ts";

type Input = {
  firstName?: string; lastName?: string; email?: string; fulfillment?: "Shipping" | "Local Pickup";
  address?: { address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  shipmentId?: string; rateId?: string;
  items?: Array<{ catalogItemId?: string; quantity?: number }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json() as Input;
    const firstName = String(input.firstName || "").trim(); const lastName = String(input.lastName || "").trim(); let email = String(input.email || "").trim().toLowerCase();
    if (!firstName || !lastName || !email.includes("@")) return json({ error: "First name, last name and a valid email are required." }, 400);
    if (!input.items?.length) return json({ error: "Your cart is empty." }, 400);
    if (input.fulfillment !== "Shipping" && input.fulfillment !== "Local Pickup") return json({ error: "Choose shipping or local pickup." }, 400);

    const user = await getOptionalUser(req);
    if (user?.email) email = user.email.toLowerCase();
    let guestToken: string | undefined;
    let guestHash: string | null = null;
    if (!user) { guestToken = makePrivateToken(); guestHash = await sha256Hex(guestToken); }

    let shippingAmount = 0;
    if (input.fulfillment === "Shipping") {
      if (!input.address?.address1 || !input.address.city || !input.address.state || !input.address.postalCode || !input.shipmentId || !input.rateId) return json({ error: "A valid shipping address and selected carrier rate are required." }, 400);
      const shipmentResponse = await fetch(`https://api.goshippo.com/shipments/${encodeURIComponent(input.shipmentId)}`, { headers: shippoHeaders() });
      if (!shipmentResponse.ok) return json({ error: "Could not verify the selected shipping rate." }, 400);
      const shipment = await shipmentResponse.json();
      const rate = (shipment.rates ?? []).find((item: any) => item.object_id === input.rateId);
      if (!rate) return json({ error: "The selected shipping rate is no longer valid." }, 400);
      shippingAmount = Number(rate.amount) || 0;
    }

    const client = adminClient();
    const rpcItems = input.items.map((item) => ({ catalog_item_id: item.catalogItemId, quantity: Math.max(1, Number(item.quantity) || 1) }));
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
    });
    if (createError || !orderId) return json({ error: createError?.message || "Could not create order." }, 400);
    const { data: order, error: orderError } = await client.from("jmb_orders").select("*").eq("id", orderId).single();
    const { data: lines, error: linesError } = await client.from("jmb_order_items").select("*").eq("order_id", orderId).order("created_at");
    if (orderError || linesError || !order) throw new Error(orderError?.message || linesError?.message || "Could not load created order.");
    const code = `JMB-${String(order.order_number).padStart(4, "0")}`;
    const accessUrl = guestToken ? `${siteUrl()}/guest/order/${order.id}?token=${encodeURIComponent(guestToken)}` : undefined;
    const itemHtml = (lines ?? []).map((line: any) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee">${line.quantity}× ${line.name}${line.team || line.option ? `<div style="font-size:12px;color:#786d80">${[line.team,line.option].filter(Boolean).join(" • ")}</div>` : ""}</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${money(Number(line.line_total))}</td></tr>`).join("");
    const fulfillmentNote = input.fulfillment === "Shipping" ? `<p><strong>Shipping:</strong> Your order will be shipped within 3–5 business days. When JMB creates your shipping label and tracking becomes available, we will email the tracking information automatically.</p>` : `<p><strong>Local pickup:</strong> We will send pickup instructions when your order is ready.</p>`;
    const privateLink = accessUrl ? `<p style="margin:22px 0"><a href="${accessUrl}" style="background:#6b55ae;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">View Private Order Page</a></p><p style="font-size:12px;color:#786d80">Keep this link private. It gives access to your guest order without a password.</p>` : `<p>You can also follow this order from your JMB customer account.</p>`;
    let emailSent = true;
    try { await sendEmail({ to: email, subject: `Thank you for your order — ${code}`, html: emailShell(`Thank you for your order!`, `<p>Hi ${firstName},</p><p>We received <strong>${code}</strong>. Here are your order details:</p><table style="width:100%;border-collapse:collapse">${itemHtml}</table><p style="text-align:right"><strong>Shipping:</strong> ${money(Number(order.shipping_amount))}<br><strong>Total:</strong> ${money(Number(order.total))}</p>${fulfillmentNote}${privateLink}`) }); }
    catch (emailError) { emailSent = false; console.error("Order confirmation email failed", emailError); }
    return json({ order, guestToken, accessUrl, emailSent });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 500); }
});
