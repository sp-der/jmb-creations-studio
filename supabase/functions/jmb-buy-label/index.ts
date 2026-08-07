import { adminClient, corsHeaders, easyPostAuth, emailShell, json, requireAdmin, sendEmail } from "../_shared/jmb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const { orderId } = await req.json() as { orderId?: string };
    if (!orderId) return json({ error: "orderId is required." }, 400);
    const client = adminClient();
    const { data: order, error } = await client.from("jmb_orders").select("*").eq("id", orderId).single();
    if (error || !order) return json({ error: "Order not found." }, 404);
    if (!order.easypost_shipment_id || !order.easypost_rate_id) return json({ error: "This order does not have a selected EasyPost shipment/rate." }, 400);
    if (order.label_url && order.tracking_code) return json({ order, labelUrl: order.label_url, trackingCode: order.tracking_code });

    const response = await fetch(`https://api.easypost.com/v2/shipments/${encodeURIComponent(order.easypost_shipment_id)}/buy`, {
      method: "POST",
      headers: { Authorization: easyPostAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ rate: { id: order.easypost_rate_id } }),
    });
    if (!response.ok) return json({ error: `Shipping provider error: ${await response.text()}` }, 502);
    const shipment = await response.json();
    const labelUrl = shipment.postage_label?.label_url || shipment.postage_label?.label_pdf_url || null;
    const trackingCode = shipment.tracking_code || shipment.tracker?.tracking_code || null;
    const carrier = shipment.selected_rate?.carrier || shipment.tracker?.carrier || null;
    const trackingStatus = shipment.tracker?.status || "Label created";
    if (!labelUrl || !trackingCode) throw new Error("EasyPost purchased the shipment but did not return a label/tracking code.");

    const { data: updated, error: updateError } = await client.from("jmb_orders").update({ label_url: labelUrl, tracking_code: trackingCode, tracking_carrier: carrier, tracking_status: trackingStatus, status: "Shipped" }).eq("id", orderId).select("*").single();
    if (updateError || !updated) throw new Error(updateError?.message || "Could not save label details.");
    const code = `JMB-${String(updated.order_number).padStart(4, "0")}`;
    let emailSent = true;
    try { await sendEmail({
      to: updated.customer_email,
      subject: `Your JMB order has shipped — ${code}`,
      html: emailShell("Your order has shipped!", `<p>Hi ${updated.first_name},</p><p>Your shipping label for <strong>${code}</strong> has been created and your tracking information is now available.</p><div style="padding:18px;border-radius:16px;background:#faf2f7"><strong>${carrier || "Carrier"}</strong><div style="margin-top:6px;font-size:20px;font-weight:bold">${trackingCode}</div></div><p style="margin-top:20px">Carrier tracking will update as the package enters the mail stream.</p>`),
    }); } catch (emailError) { emailSent = false; console.error("Tracking email failed", emailError); }
    return json({ order: updated, labelUrl, trackingCode, emailSent });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 401); }
});
