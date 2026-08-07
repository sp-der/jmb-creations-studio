import { getAdminAuthHeaders, getSupabaseConfig } from "@/lib/live-catalog";

export type DesignLabel = {
  id?: string;
  family_slug: string;
  design_id: string;
  display_name: string;
  updated_at?: string;
};

function publicHeaders() {
  const { anonKey } = getSupabaseConfig();
  if (!anonKey) throw new Error("Supabase is not configured.");
  return { apikey: anonKey, "Content-Type": "application/json" };
}

async function parseError(response: Response) {
  const text = await response.text();
  try { const data = JSON.parse(text); return data.message || data.error || text; } catch { return text || `${response.status} ${response.statusText}`; }
}

export async function fetchDesignLabels(familySlug: string) {
  const { url } = getSupabaseConfig();
  if (!url) return [] as DesignLabel[];
  const response = await fetch(`${url}/rest/v1/jmb_design_labels?family_slug=eq.${encodeURIComponent(familySlug)}&select=*`, { headers: publicHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as DesignLabel[];
}

export async function saveDesignLabel(input: Omit<DesignLabel, "id" | "updated_at">) {
  const { url } = getSupabaseConfig();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/rest/v1/jmb_design_labels?on_conflict=family_slug,design_id`, {
    method: "POST",
    headers: { ...getAdminAuthHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as DesignLabel[];
  return rows[0];
}

export async function deleteDesignLabel(familySlug: string, designId: string) {
  const { url } = getSupabaseConfig();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/rest/v1/jmb_design_labels?family_slug=eq.${encodeURIComponent(familySlug)}&design_id=eq.${encodeURIComponent(designId)}`, {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export function labelsToMap(labels: DesignLabel[]) {
  return Object.fromEntries(labels.map((item) => [item.design_id, item.display_name])) as Record<string, string>;
}
