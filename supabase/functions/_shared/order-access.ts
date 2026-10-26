import { adminClient, getOptionalUser } from "./jmb.ts";
import { ownsOrder, UUID } from "./order-logic.ts";
export async function orderAccess(
  req: Request,
  orderId: string,
  token?: string,
  allowAdmin = true,
) {
  if (!UUID.test(orderId)) return null;
  const client = adminClient();
  const user = await getOptionalUser(req);
  let admin = false;
  if (allowAdmin && user && !user.is_anonymous) {
    const result = await client
      .from("jmb_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (result.error) throw new Error("Authorization unavailable.");
    admin = Boolean(result.data);
  }
  const { data: order, error } = await client
    .from("jmb_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error("Order unavailable.");
  let guest = false;
  if (
    order &&
    !admin &&
    !ownsOrder(user, order) &&
    typeof token === "string" &&
    token.length >= 32 &&
    token.length <= 256
  ) {
    const result = await client.rpc("jmb_valid_guest_order", {
      p_order_id: orderId,
      p_token: token,
    });
    if (result.error) throw new Error("Guest authorization unavailable.");
    guest = result.data === true;
  }
  if (!order || (!admin && !guest && !ownsOrder(user, order))) return null;
  return { client, user, order, admin, guest };
}
export function safeOrder(order: Record<string, unknown>) {
  const { guest_token_hash: _hash, checkout_fingerprint: _fingerprint, ...safe } = order;
  return safe;
}
