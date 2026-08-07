export type CustomerSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: { id?: string; email?: string };
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const CUSTOMER_SESSION_KEY = "jmb-customer-supabase-session";

export function isCustomerAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomerSession(session: CustomerSession) {
  if (typeof window !== "undefined") localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
}

export function customerSignOut() {
  if (typeof window !== "undefined") localStorage.removeItem(CUSTOMER_SESSION_KEY);
}

async function parseError(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.msg || data.message || data.error_description || data.error || text;
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}

export async function customerSignIn(email: string, password: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const session = (await response.json()) as CustomerSession;
  saveCustomerSession(session);
  return session;
}

export async function customerSignUp(email: string, password: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const result = (await response.json()) as CustomerSession;
  if (result.access_token) saveCustomerSession(result);
  return result;
}

export function customerAuthHeaders() {
  const session = getCustomerSession();
  if (!SUPABASE_ANON_KEY || !session?.access_token) throw new Error("Customer sign-in is required.");
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export function getSupabaseRestUrl() {
  if (!SUPABASE_URL) throw new Error("Supabase is not configured yet.");
  return `${SUPABASE_URL}/rest/v1`;
}

export function getSupabaseAnonKey() {
  return SUPABASE_ANON_KEY;
}
