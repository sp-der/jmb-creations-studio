export type CustomerSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const LOCAL_SESSION_KEY = "jmb-customer-supabase-session";
const SESSION_SESSION_KEY = "jmb-customer-supabase-session-temporary";
const REMEMBER_KEY = "jmb-customer-remember";

export function isCustomerAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function parseStored(raw: string | null): CustomerSession | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as CustomerSession; } catch { return null; }
}

export function isCustomerRemembered() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

export function getCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  return parseStored(localStorage.getItem(LOCAL_SESSION_KEY)) ?? parseStored(sessionStorage.getItem(SESSION_SESSION_KEY));
}

export function saveCustomerSession(session: CustomerSession, remember = true) {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(REMEMBER_KEY, "true");
    sessionStorage.removeItem(SESSION_SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.setItem(REMEMBER_KEY, "false");
  }
}

export function customerSignOut() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_SESSION_KEY);
  sessionStorage.removeItem(SESSION_SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
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

async function refreshSession(session: CustomerSession) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !session.refresh_token) return session;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    customerSignOut();
    throw new Error(await parseError(response));
  }
  const next = (await response.json()) as CustomerSession;
  saveCustomerSession(next, isCustomerRemembered());
  return next;
}

export async function getValidCustomerSession() {
  const session = getCustomerSession();
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || session.expires_at > now + 60) return session;
  return refreshSession(session);
}

export async function customerSignIn(email: string, password: string, remember = true) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const session = (await response.json()) as CustomerSession;
  saveCustomerSession(session, remember);
  return session;
}

export async function customerSignUp(
  email: string,
  password: string,
  remember = true,
  profile?: { first_name?: string; last_name?: string },
) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: profile ?? {} }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const result = (await response.json()) as CustomerSession;
  if (result.access_token) saveCustomerSession(result, remember);
  return result;
}

export async function customerAuthHeaders() {
  const session = await getValidCustomerSession();
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

export function getSupabaseUrl() {
  return SUPABASE_URL;
}

export function getSupabaseAnonKey() {
  return SUPABASE_ANON_KEY;
}
