import { adminClient, corsHeaders, json, requireAdmin } from "../_shared/jmb.ts";
import { safeOrder } from "../_shared/order-access.ts";
import { UUID } from "../_shared/order-logic.ts";
// An explicit admin action, never a historical cleanup or automatic cancellation.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    await requireAdmin(req);
  } catch {
    return json({ error: "Admin access required." }, 403);
  }
  const client = adminClient();
  let orderId = "";
  let lease = "";
  try {
    const input = await req.json();
    orderId = input.orderId;
    if (typeof orderId !== "string" || !UUID.test(orderId))
      return json({ error: "Invalid checkout." }, 400);
    const lock = await client.rpc("jmb_checkout_lock", { p_order_id: orderId, p_close: true });
    if (lock.error)
      return json({ error: "Checkout is busy, paid, or historical. Refresh and retry." }, 409);
    const order = lock.data.order;
    lease = lock.data.leaseId;
    if (order.square_order_id) {
      const token = Deno.env.get("SQUARE_ACCESS_TOKEN");
      if (!token) throw new Error("Square is not configured.");
      const base =
        Deno.env.get("SQUARE_ENVIRONMENT") === "production"
          ? "https://connect.squareup.com"
          : "https://connect.squareupsandbox.com";
      const headers = { Authorization: `Bearer ${token}`, "Square-Version": "2026-07-15" };
      const retrieve = async () => {
        const response = await fetch(
          `${base}/v2/orders/${encodeURIComponent(order.square_order_id)}`,
          { headers, signal: AbortSignal.timeout(10000) },
        );
        if (!response.ok) throw new Error("Square order status could not be verified.");
        return (await response.json()).order;
      };
      let square = await retrieve();
      if (square.state !== "CANCELED") {
        if (square.state === "COMPLETED" || square.tenders?.length)
          throw new Error("Payment activity requires reconciliation. Stock remains reserved.");
        if (!order.square_payment_link_id)
          throw new Error("Square link is unavailable for safe cancellation.");
        const deleted = await fetch(
          `${base}/v2/online-checkout/payment-links/${encodeURIComponent(order.square_payment_link_id)}`,
          { method: "DELETE", headers, signal: AbortSignal.timeout(10000) },
        );
        if (!deleted.ok)
          throw new Error("Square checkout could not be cancelled. Stock remains reserved.");
        square = await retrieve();
      }
      if (square.state !== "CANCELED" || square.tenders?.length)
        throw new Error("Square closure requires reconciliation. Stock remains reserved.");
    }
    const closed = await client.rpc("jmb_finish_checkout_close", {
      p_order_id: orderId,
      p_lease_id: lease,
    });
    if (closed.error) throw new Error("Checkout closure requires reconciliation.");
    const result = await client.from("jmb_orders").select("*").eq("id", orderId).single();
    if (result.error) throw new Error("Could not reload cancelled checkout.");
    return json({ order: safeOrder(result.data) });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Checkout could not be closed." },
      409,
    );
  } finally {
    if (lease)
      await client
        .from("jmb_orders")
        .update({ checkout_lease_until: null })
        .eq("id", orderId)
        .eq("checkout_lease_id", lease);
  }
});
