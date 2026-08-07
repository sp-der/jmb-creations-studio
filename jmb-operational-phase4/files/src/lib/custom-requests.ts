import { customerAuthHeaders, getCustomerSession, getSupabaseAnonKey, getSupabaseRestUrl, getSupabaseUrl } from "@/lib/customer-auth";
import { getAdminSession, getAdminAuthHeaders } from "@/lib/live-catalog";

export type CustomRequestStatus = "New" | "In Review" | "Quoted" | "Accepted" | "Declined" | "Converted";

export type CustomRequest = {
  id: string;
  request_number: number;
  customer_user_id: string | null;
  customer_name: string;
  customer_email: string;
  first_name: string | null;
  last_name: string | null;
  product_family: string;
  idea: string;
  colors: string | null;
  size: string | null;
  quantity: number;
  fulfillment: "Shipping" | "Local Pickup" | "Not sure";
  status: CustomRequestStatus;
  quote: number | null;
  is_guest: boolean;
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

async function parseError(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.message || data.error_description || data.error || text;
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}

function publicHeaders() {
  const anon = getSupabaseAnonKey();
  if (!anon) throw new Error("Supabase is not configured.");
  return { apikey: anon, "Content-Type": "application/json" };
}

export function requestCode(request: Pick<CustomRequest, "request_number">) {
  return `REQ-${String(request.request_number).padStart(3, "0")}`;
}

export async function fetchCustomerRequests() {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests?select=*&order=created_at.desc`, {
    headers: await customerAuthHeaders(),
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
  const meta = session.user?.user_metadata ?? {};
  const firstName = typeof meta.first_name === "string" ? meta.first_name : null;
  const lastName = typeof meta.last_name === "string" ? meta.last_name : null;
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests`, {
    method: "POST",
    headers: { ...(await customerAuthHeaders()), Prefer: "return=representation" },
    body: JSON.stringify({
      customer_user_id: userId,
      customer_email: email,
      first_name: firstName,
      last_name: lastName,
      is_guest: false,
      ...input,
      colors: input.colors || null,
      size: input.size || null,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomRequest[];
  return rows[0];
}

export async function createGuestRequest(input: {
  firstName: string;
  lastName: string;
  email: string;
  productFamily: string;
  idea: string;
  colors?: string;
  size?: string;
  quantity: number;
  fulfillment: CustomRequest["fulfillment"];
}) {
  const url = getSupabaseUrl();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-create-guest-request`, {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json() as { request: CustomRequest; guestToken: string; accessUrl: string; emailSent?: boolean };
}

export async function fetchAdminRequests() {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_custom_requests?select=*&order=created_at.desc`, { headers: getAdminAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CustomRequest[];
}

export async function fetchMessages(requestId: string, role: "customer" | "admin") {
  const base = getSupabaseRestUrl();
  const headers = role === "admin" ? getAdminAuthHeaders() : await customerAuthHeaders();
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
  const headers = sender === "admin" ? getAdminAuthHeaders() : await customerAuthHeaders();
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
    headers: { ...getAdminAuthHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomRequest[];
  return rows[0];
}

export async function fetchGuestRequest(requestId: string, token: string) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/rpc/jmb_guest_get_custom_request`, {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ p_request_id: requestId, p_token: token }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomRequest[];
  return rows[0] ?? null;
}

export async function fetchGuestMessages(requestId: string, token: string) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/rpc/jmb_guest_get_custom_messages`, {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ p_request_id: requestId, p_token: token }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CustomMessage[];
}

export async function sendGuestMessage(requestId: string, token: string, body: string) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/rpc/jmb_guest_send_custom_message`, {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ p_request_id: requestId, p_token: token, p_body: body }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as CustomMessage[];
  return rows[0] ?? null;
}
