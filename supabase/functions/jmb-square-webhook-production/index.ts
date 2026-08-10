import { adminClient, emailShell, money, sendEmail } from "../_shared/jmb.ts";

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifySquareSignature(rawBody: string, signature: string) {
  const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY_PRODUCTION");
  const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL_PRODUCTION");
  if (!signatureKey || !notificationUrl || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64(signature),
    new TextEncoder().encode(`${notificationUrl}${rawBody}`),
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") || "";
  if (!(await verifySquareSignature(rawBody, signature))) return new Response("Invalid signature", { status: 403 });

  try {
    const event = JSON.parse(rawBody);
    if (event?.type !== "payment.updated" && event?.type !== "payment.created") return new Response("ok", { status: 200 });
    const payment = event?.data?.object?.payment;
    if (!payment?.order_id || payment?.status !== "COMPLETED") return new Response("ok", { status: 200 });

    const client = adminClient();
    const { data: order, error: orderError } = await client.from("jmb_orders").select("*").eq("square_order_id", payment.order_id).maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) return new Response("ok", { status: 200 });

    const expectedAmount = Math.round(Number(order.total) * 100);
    const paidAmount = Number(payment?.amount_money?.amount || 0);
    if (expectedAmount !== paidAmount) {
      console.error("Square amount mismatch", { orderId: order.id, expectedAmount, paidAmount, squarePaymentId: payment.id });
      return new Response("ok", { status: 200 });
    }

    if (order.payment_status === "Paid" && order.square_payment_id === payment.id) return new Response("ok", { status: 200 });

    const { data: updated, error: updateError } = await client.from("jmb_orders")
      .update({
        payment_method: "Square",
        payment_status: "Paid",
        payment_submitted_at: new Date().toISOString(),
        square_payment_id: payment.id,
        status: order.status === "Order Received" ? "Payment Confirmed" : order.status,
      })
      .eq("id", order.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    const code = `JMB-${String(updated.order_number).padStart(4, "0")}`;
    try {
      await sendEmail({
        to: updated.customer_email,
        subject: `Payment confirmed — ${code}`,
        html: emailShell("Payment confirmed", `<p>Hi ${updated.first_name},</p><p>Your Square payment of <strong>${money(Number(updated.total))}</strong> has been confirmed for <strong>${code}</strong>.</p><p>Your order is now ready for JMB's production and fulfillment workflow.</p>`),
      });
    } catch (emailError) {
      console.error("Square payment confirmation email failed", emailError);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Square webhook error", error);
    return new Response("Server error", { status: 500 });
  }
});
