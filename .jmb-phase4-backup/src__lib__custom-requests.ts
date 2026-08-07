import { customerAuthHeaders, getCustomerSession, getSupabaseAnonKey, getSupabaseRestUrl } from "@/lib/customer-auth";
import { getAdminSession } from "@/lib/live-catalog";

export type CustomRequestStatus = "New" | "In Review" | "Quoted" | "Accepted" | "Declined" | "Converted";

export type CustomRequest = {
  id: string;
  request_number: number;
  customer_user_id: string;
  customer_name: string;
  customer_email: string;
  product_family: string;
  idea: string;
  colors: string | null;
  size: string | null;
  quantity: number;
  fulfillment: "Shipping" | "Local Pickup" | "Not sure";
  status: CustomRequestStatus;
  quote: number | null;
  created_at: string;
  updated_at: string;
};

export type CustomMessage = {
  id: string;
  request_id: string;
  sender: "customer" | "admin";
  sender_user_id: string | null;
  body: string;
  created_at: string;
};

function adminHeaders() {
  const anon = getSupabaseAnonKey();
  const session = getAdminSession();
  if (!anon || !session?.access_token) throw new Error("Admin sign-in is required in Catalog first.");
  return {
    apikey: anon,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.message || data.error_description || data.error || text;
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}

export function requestCode(request: Pick<CustomRequest, "request_number">) {
  return `REQ-${String(request.request_number).padStart(3, "0")}`;
}

export async function fetchCustomerRequests() {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests?select=*&order=created_at.desc`, {
    headers: customerAuthHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CustomRequest[];
}

export async function createCustomerRequest(input: {
  customer_name: string;
  product_family: string;
  idea: string;
  colors?: string;
  size?: string;
  quantity: number;
  fulfillment: CustomRequest["fulfillment"];
}) {
  const session = getCustomerSession();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) throw new Error("Customer sign-in is required.");
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests`, {
    method: "POST",
    headers: { ...customerAuthHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({
      customer_user_id: userId,
      customer_email: email,
      ...input,
      colors: input.colors || null,
      size: input.size || null,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomRequest[];
  return rows[0];
}

export async function fetchAdminRequests() {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests?select=*&order=created_at.desc`, { headers: adminHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CustomRequest[];
}

export async function fetchMessages(requestId: string, role: "customer" | "admin") {
  const base = getSupabaseRestUrl();
  const headers = role === "admin" ? adminHeaders() : customerAuthHeaders();
  const response = await fetch(
    `${base}/jmb_custom_messages?request_id=eq.${encodeURIComponent(requestId)}&select=*&order=created_at.asc`,
    { headers },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CustomMessage[];
}

export async function sendMessage(requestId: string, sender: "customer" | "admin", body: string) {
  const base = getSupabaseRestUrl();
  const session = sender === "admin" ? getAdminSession() : getCustomerSession();
  const headers = sender === "admin" ? adminHeaders() : customerAuthHeaders();
  const response = await fetch(`${base}/jmb_custom_messages`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      request_id: requestId,
      sender,
      sender_user_id: session?.user?.id ?? null,
      body,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomMessage[];
  return rows[0];
}

export async function updateRequest(
  requestId: string,
  patch: Partial<Pick<CustomRequest, "status" | "quote">>,
) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests?id=eq.${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomRequest[];
  return rows[0];
}
