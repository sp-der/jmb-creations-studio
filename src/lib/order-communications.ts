import { getSupabaseAnonKey, getSupabaseUrl, getValidCustomerSession } from "@/lib/customer-auth";
import { getAdminAuthHeaders } from "@/lib/live-catalog";
export type OrderMessage = {
  id: string;
  order_id: string;
  sender: "admin" | "customer";
  sender_name: string;
  body: string;
  created_at: string;
  admin_seen_at: string | null;
  customer_seen_at: string | null;
};
export type Delivery = {
  id: string;
  kind: string;
  state: "pending" | "sending" | "sent" | "needs_review";
  attempts: number;
  last_error: string | null;
  provider_id: string | null;
  sent_at: string | null;
  created_at: string;
  subject: string | null;
};
export async function orderCommunication<T>(
  action: string,
  input: Record<string, unknown> = {},
  admin = false,
): Promise<T> {
  const anon = getSupabaseAnonKey();
  const url = getSupabaseUrl();
  if (!anon || !url) throw new Error("Supabase is not configured.");
  const session = admin ? null : await getValidCustomerSession().catch(() => null);
  const headers = admin
    ? getAdminAuthHeaders()
    : {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        "Content-Type": "application/json",
      };
  const response = await fetch(`${url}/functions/v1/jmb-order-communications`, {
    method: "POST",
    headers: { ...headers, apikey: anon },
    body: JSON.stringify({ ...input, action }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load conversation.");
  return result as T;
}
export function orderDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  // Existing California business context. Override at build time if the business timezone differs.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: import.meta.env["VITE_JMB_TIMEZONE"] || "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
