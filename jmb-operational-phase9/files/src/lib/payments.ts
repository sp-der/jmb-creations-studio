import { getCustomerSession, getSupabaseAnonKey, getSupabaseRestUrl, getSupabaseUrl, getValidCustomerSession } from "@/lib/customer-auth";
import type { JmbOrder } from "@/lib/orders";

export type PaymentMethod = "Square" | "Zelle" | "PayPal" | "Venmo";

export type PaymentSetting = {
  method: PaymentMethod;
  display_name: string;
  detail_label: string | null;
  payment_details: string | null;
  instructions: string | null;
  logo_url: string | null;
  is_enabled: boolean;
  sort_order: number;
};

async function parseError(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.error || data.message || text;
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}

async function functionHeaders() {
  const anon = getSupabaseAnonKey();
  if (!anon) throw new Error("Supabase is not configured.");
  const session = await getValidCustomerSession().catch(() => null);
  return {
    apikey: anon,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    "Content-Type": "application/json",
  };
}

export function orderPaymentTokenKey(orderId: string) {
  return `jmb-order-payment-token:${orderId}`;
}

export function rememberGuestPaymentToken(orderId: string, token?: string) {
  if (typeof window === "undefined" || !token) return;
  sessionStorage.setItem(orderPaymentTokenKey(orderId), token);
}

export function getRememberedGuestPaymentToken(orderId: string) {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(orderPaymentTokenKey(orderId)) || "";
}

export async function fetchPaymentSettings() {
  const anon = getSupabaseAnonKey();
  const base = getSupabaseRestUrl();
  if (!anon) throw new Error("Supabase is not configured.");
  const response = await fetch(`${base}/jmb_payment_settings?select=*&is_enabled=eq.true&order=sort_order.asc`, {
    headers: { apikey: anon, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PaymentSetting[];
}

export async function startSquareCheckout(orderId: string, guestToken?: string, returnOrigin?: string) {
  const url = getSupabaseUrl();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-create-square-checkout`, {
    method: "POST",
    headers: await functionHeaders(),
    body: JSON.stringify({ orderId, guestToken: guestToken || undefined, returnOrigin: returnOrigin || undefined }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as { url: string; order: JmbOrder };
}

export async function markManualPaymentSent(orderId: string, method: Exclude<PaymentMethod, "Square">, guestToken?: string) {
  const url = getSupabaseUrl();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-manual-payment-sent`, {
    method: "POST",
    headers: await functionHeaders(),
    body: JSON.stringify({ orderId, method, guestToken: guestToken || undefined }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as { order: JmbOrder; emailSent?: boolean };
}

export function isSignedInForPayments() {
  return Boolean(getCustomerSession()?.access_token);
}
