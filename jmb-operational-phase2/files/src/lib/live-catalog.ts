export type LiveCatalogItem = {
  id: string;
  family_slug: string;
  name: string;
  image_url: string;
  team: string | null;
  size: string | null;
  price: number;
  stock: number;
  made_to_order: boolean;
  active: boolean;
  sort_order: number;
  created_at?: string;
};

export type LiveCatalogItemInput = Omit<LiveCatalogItem, "id" | "created_at">;

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SESSION_KEY = "jmb-admin-supabase-session";
const BUCKET = "jmb-catalog";

export function isSupabaseCatalogConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function publicHeaders() {
  if (!SUPABASE_ANON_KEY) throw new Error("Supabase anon key is not configured.");
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

export type AdminSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: { id?: string; email?: string };
};

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

function adminHeaders() {
  const session = getAdminSession();
  if (!SUPABASE_ANON_KEY || !session?.access_token) throw new Error("Admin sign-in is required.");
  return {
    apikey: SUPABASE_ANON_KEY,
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

export async function adminSignIn(email: string, password: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const session = (await response.json()) as AdminSession;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function fetchLiveCatalogItems(familySlug: string, includeInactive = false) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [] as LiveCatalogItem[];
  const filters = [
    `family_slug=eq.${encodeURIComponent(familySlug)}`,
    includeInactive ? "" : "active=eq.true",
    "select=*",
    "order=sort_order.asc,created_at.desc",
  ].filter(Boolean).join("&");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/jmb_catalog_items?${filters}`, {
    headers: includeInactive ? adminHeaders() : publicHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as LiveCatalogItem[];
}

export async function createLiveCatalogItem(input: LiveCatalogItemInput) {
  if (!SUPABASE_URL) throw new Error("Supabase is not configured.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/jmb_catalog_items`, {
    method: "POST",
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as LiveCatalogItem[];
  return rows[0];
}

export async function updateLiveCatalogItem(id: string, patch: Partial<LiveCatalogItemInput>) {
  if (!SUPABASE_URL) throw new Error("Supabase is not configured.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/jmb_catalog_items?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as LiveCatalogItem[];
  return rows[0];
}

export async function deleteLiveCatalogItem(id: string) {
  if (!SUPABASE_URL) throw new Error("Supabase is not configured.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/jmb_catalog_items?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
}

async function imageFileToWebp(file: File, maxSide = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not convert image to WebP.")), "image/webp", quality);
  });
}

export async function uploadCatalogImage(file: File, familySlug: string, itemName: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
  const webp = await imageFileToWebp(file);
  const stamp = Date.now();
  const objectPath = `${safeFileName(familySlug)}/${stamp}-${safeFileName(itemName)}.webp`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getAdminSession()?.access_token ?? ""}`,
      "Content-Type": "image/webp",
      "x-upsert": "false",
    },
    body: webp,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

export function formatCatalogPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(price) || 0);
}
