import { adminClient, corsHeaders, emailShell, getOptionalUser, json, money, sendEmail, sha256Hex } from "../_shared/jmb.ts";

type Input = { orderId?: string; method?: "Zelle" | "PayPal" | "Venmo"; guestToken?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json() as Input;
    const orderId = String(input.orderId || "").trim();
    const method = input.method;
    if (!orderId || !method || !["Zelle", "PayPal", "Venmo"].includes(method)) return json({ error: "Valid order and payment method required." }, 400);

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

    const { data: updated, error: updateError } = await client.from("jmb_orders")
      .update({ payment_method: method, payment_status: "Pending", payment_submitted_at: new Date().toISOString() })
      .eq("id", orderId)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    const code = `JMB-${String(updated.order_number).padStart(4, "0")}`;
    let emailSent = true;
    try {
      await sendEmail({
        to: updated.customer_email,
        subject: `Payment submitted for review — ${code}`,
        html: emailShell("Payment submitted", `<p>Hi ${updated.first_name},</p><p>We marked your <strong>${method}</strong> payment for <strong>${money(Number(updated.total))}</strong> as submitted. JMB will verify the payment before your order moves into production.</p><p><strong>Order:</strong> ${code}</p><p>If JMB cannot match the payment, we may contact you using the email on this order.</p>`),
      });
    } catch (emailError) {
      emailSent = false;
      console.error("Manual payment confirmation email failed", emailError);
    }

    return json({ order: updated, emailSent });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
