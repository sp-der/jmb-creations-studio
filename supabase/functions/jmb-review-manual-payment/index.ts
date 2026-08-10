import { adminClient, corsHeaders, emailShell, json, money, requireAdmin, sendEmail } from "../_shared/jmb.ts";

type Input = { orderId?: string; approved?: boolean };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const input = await req.json() as Input;
    const orderId = String(input.orderId || "").trim();
    if (!orderId) return json({ error: "Order ID is required." }, 400);

    const client = adminClient();
    const { data: order, error: orderError } = await client.from("jmb_orders").select("*").eq("id", orderId).maybeSingle();
    if (orderError || !order) return json({ error: "Order not found." }, 404);
    if (!order.payment_method || order.payment_method === "Square") return json({ error: "This order is not waiting for manual payment verification." }, 400);

    const approved = input.approved === true;
    const patch = approved
      ? {
          payment_status: "Paid",
          status: order.status === "Order Received" ? "Payment Confirmed" : order.status,
        }
      : {
          payment_status: "Unpaid",
          payment_submitted_at: null,
        };

    const { data: updated, error: updateError } = await client.from("jmb_orders").update(patch).eq("id", orderId).select("*").single();
    if (updateError) throw new Error(updateError.message);

    const code = `JMB-${String(updated.order_number).padStart(4, "0")}`;
    let emailSent = true;
    try {
      if (approved) {
        await sendEmail({
          to: updated.customer_email,
          subject: `Payment confirmed — ${code}`,
          html: emailShell("Payment confirmed", `<p>Hi ${updated.first_name},</p><p>JMB has verified your <strong>${updated.payment_method}</strong> payment of <strong>${money(Number(updated.total))}</strong> for <strong>${code}</strong>.</p><div style="margin:20px 0;padding:16px;border-radius:16px;background:#f8eff8"><strong>Your order is now payment confirmed.</strong><br>JMB can move it into production and fulfillment.</div>`),
        });
      } else {
        await sendEmail({
          to: updated.customer_email,
          subject: `Payment needs attention — ${code}`,
          html: emailShell("We could not verify your payment", `<p>Hi ${updated.first_name},</p><p>JMB could not match a ${updated.payment_method} payment to <strong>${code}</strong> yet.</p><p>Please check the payment details and resend if needed. Be sure the payment note includes your name or <strong>${code}</strong>, then return to your private order page and press <strong>Payment Sent</strong> again.</p>`),
        });
      }
    } catch (emailError) {
      emailSent = false;
      console.error("Manual payment review email failed", emailError);
    }

    return json({ order: updated, emailSent });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
