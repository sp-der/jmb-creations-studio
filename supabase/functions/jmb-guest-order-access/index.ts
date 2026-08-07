import { adminClient, corsHeaders, json, sha256Hex } from "../_shared/jmb.ts";

type Input = { orderId?: string; token?: string };

function safeOrder(order: Record<string, unknown>) {
  const { guest_token_hash: _guestTokenHash, ...safe } = order;
  return safe;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const input = await req.json() as Input;
    const orderId = String(input.orderId || "").trim();
    const token = String(input.token || "").trim();
    if (!orderId || !token) return json({ error: "Private order ID and token are required." }, 400);

    const client = adminClient();
    const { data: order, error: orderError } = await client.from("jmb_orders").select("*").eq("id", orderId).maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) return json({ error: "Private order not found." }, 404);
    if (!order.guest_token_hash) return json({ error: "This order is attached to a customer account." }, 403);

    const suppliedHash = await sha256Hex(token);
    if (suppliedHash !== order.guest_token_hash) return json({ error: "This private order link is invalid." }, 403);

    const { data: items, error: itemsError } = await client.from("jmb_order_items").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
    if (itemsError) throw new Error(itemsError.message);
    return json({ order: safeOrder(order), items: items ?? [] });
  } catch (error) {
    console.error("Guest order access failed", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
