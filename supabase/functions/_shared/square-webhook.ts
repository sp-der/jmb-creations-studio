import { adminClient } from "./jmb.ts";
import { validPayment, verifySignature, type VerifiedPayment } from "./order-logic.ts";
import { drainNotifications } from "./order-notifications.ts";
export function squareWebhook(production = false) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const raw = await req.text();
    if (raw.length > 1000000) return new Response("Too large", { status: 413 });
    const suffix = production ? "_PRODUCTION" : "";
    const key = Deno.env.get(`SQUARE_WEBHOOK_SIGNATURE_KEY${suffix}`) || "";
    const url = Deno.env.get(`SQUARE_WEBHOOK_NOTIFICATION_URL${suffix}`) || "";
    if (
      !(await verifySignature(
        raw,
        req.headers.get("x-square-hmacsha256-signature") || "",
        key,
        url,
      ))
    )
      return new Response("Invalid signature", { status: 403 });
    try {
      const event = JSON.parse(raw);
      if (!["payment.updated", "payment.created"].includes(event?.type)) return new Response("ok");
      const notice = event?.data?.object?.payment;
      if (!notice?.id || !notice.order_id || notice.status !== "COMPLETED")
        return new Response("ok");
      const client = adminClient();
      const { data: order, error } = await client
        .from("jmb_orders")
        .select("id,total,square_order_id")
        .eq("square_order_id", notice.order_id)
        .maybeSingle();
      if (error) throw new Error("Order lookup unavailable");
      if (!order) return new Response("ok");
      const token = Deno.env.get("SQUARE_ACCESS_TOKEN");
      const location = Deno.env.get("SQUARE_LOCATION_ID");
      if (!token || !location) throw new Error("Square configuration unavailable");
      const environment =
        production || Deno.env.get("SQUARE_ENVIRONMENT") === "production"
          ? "production"
          : "sandbox";
      const base =
        environment === "production"
          ? "https://connect.squareup.com"
          : "https://connect.squareupsandbox.com";
      const response = await fetch(`${base}/v2/payments/${encodeURIComponent(notice.id)}`, {
        headers: { Authorization: `Bearer ${token}`, "Square-Version": "2026-07-15" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Square payment lookup HTTP ${response.status}`);
      const payment = (await response.json()).payment as VerifiedPayment;
      if (!payment || payment.id !== notice.id || !validPayment(payment, order, location))
        throw new Error("Square payment verification mismatch");
      const result = await client.rpc("jmb_confirm_square_payment", {
        p_square_order_id: payment.order_id,
        p_payment_id: payment.id,
        p_amount: payment.amount_money!.amount,
        p_currency: payment.amount_money!.currency,
        p_paid_at: payment.updated_at || payment.created_at || new Date().toISOString(),
      });
      if (result.error || !result.data)
        throw new Error("Payment persistence or reconciliation failed");
      // Payment update + both outbox rows commit atomically; cron recovers provider outages.
      try {
        await drainNotifications(client, order.id);
      } catch {
        console.error("JMB paid notification queue unavailable");
      }
      return new Response("ok");
    } catch (error) {
      console.error("JMB Square webhook failed", {
        detail: error instanceof Error ? error.message : "Invalid event",
      });
      return new Response("Payment verification requires retry", { status: 500 });
    }
  };
}
