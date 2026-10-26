export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SITE = "https://jmb2creations.com";
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!,
  );
}
export function messageText(value: unknown, max = 4000): string {
  if (typeof value !== "string") throw new Error("Enter a message.");
  const text = value.replace(/\r\n?/g, "\n").trim();
  // eslint-disable-next-line no-control-regex -- Reject unsafe control characters in messages.
  if (!text || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
    throw new Error(`Enter 1–${max.toLocaleString("en-US")} characters of text.`);
  return text;
}
export function ownsOrder(
  user: { id: string; is_anonymous?: boolean } | null,
  order: { customer_user_id: string | null },
): boolean {
  return Boolean(user && !user.is_anonymous && order.customer_user_id === user.id);
}
export function portalLink(orderId: string, account: boolean, token = ""): string {
  if (!UUID.test(orderId)) throw new Error("Invalid order.");
  if (!account && !token) throw new Error("Guest token is required.");
  return account
    ? `${SITE}/orders/${orderId}`
    : `${SITE}/guest/order/${orderId}?token=${encodeURIComponent(token)}`;
}
export type VerifiedPayment = {
  id?: string;
  order_id?: string;
  status?: string;
  location_id?: string;
  amount_money?: { amount?: number; currency?: string };
  updated_at?: string;
  created_at?: string;
};
export function validPayment(
  payment: VerifiedPayment,
  expected: { square_order_id: string; total: number },
  location: string,
): boolean {
  return Boolean(
    payment.id &&
    payment.status === "COMPLETED" &&
    payment.order_id === expected.square_order_id &&
    payment.location_id === location &&
    payment.amount_money?.currency === "USD" &&
    payment.amount_money.amount === Math.round(Number(expected.total) * 100),
  );
}
export async function verifySignature(
  raw: string,
  signature: string,
  keyText: string,
  url: string,
): Promise<boolean> {
  if (!signature || !keyText || !url) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keyText),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)),
      new TextEncoder().encode(url + raw),
    );
  } catch {
    return false;
  }
}
export const retrySeconds = (attempts: number) => Math.min(3600, 15 * 2 ** Math.min(attempts, 8));
