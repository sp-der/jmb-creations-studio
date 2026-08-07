import { CreditCard, Loader2, Save, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminAuthHeaders } from "@/lib/live-catalog";
import { getSupabaseRestUrl } from "@/lib/customer-auth";
import type { PaymentMethod, PaymentSetting } from "@/lib/payments";

type StoreSettings = {
  id: number;
  ship_from_name: string;
  ship_from_street1: string;
  ship_from_street2: string | null;
  ship_from_city: string;
  ship_from_state: string;
  ship_from_zip: string;
  ship_from_country: string;
};

const MANUAL: PaymentMethod[] = ["Zelle", "PayPal", "Venmo"];

async function parseError(response: Response) {
  const text = await response.text();
  try { const data = JSON.parse(text); return data.error || data.message || text; }
  catch { return text || `${response.status} ${response.statusText}`; }
}

export function StorePaymentSettings() {
  const [store, setStore] = useState<StoreSettings>({ id: 1, ship_from_name: "JMB 2 Creations", ship_from_street1: "", ship_from_street2: "", ship_from_city: "", ship_from_state: "", ship_from_zip: "", ship_from_country: "US" });
  const [payments, setPayments] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [savingMethod, setSavingMethod] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const base = getSupabaseRestUrl();
      const headers = getAdminAuthHeaders();
      const [storeResponse, paymentResponse] = await Promise.all([
        fetch(`${base}/jmb_store_settings?id=eq.1&select=*`, { headers }),
        fetch(`${base}/jmb_payment_settings?select=*&order=sort_order.asc`, { headers }),
      ]);
      if (!storeResponse.ok) throw new Error(await parseError(storeResponse));
      if (!paymentResponse.ok) throw new Error(await parseError(paymentResponse));
      const storeRows = (await storeResponse.json()) as StoreSettings[];
      const paymentRows = (await paymentResponse.json()) as PaymentSetting[];
      if (storeRows[0]) setStore(storeRows[0]);
      setPayments(paymentRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load store settings.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function saveStore() {
    setSavingStore(true);
    try {
      const base = getSupabaseRestUrl();
      const response = await fetch(`${base}/jmb_store_settings?id=eq.1`, {
        method: "PATCH",
        headers: { ...getAdminAuthHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(store),
      });
      if (!response.ok) throw new Error(await parseError(response));
      const rows = (await response.json()) as StoreSettings[];
      if (rows[0]) setStore(rows[0]);
      toast.success("Shipping origin saved", { description: "Calculate Shipping will now use this address." });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save shipping origin."); }
    finally { setSavingStore(false); }
  }

  function updatePayment(method: PaymentMethod, patch: Partial<PaymentSetting>) {
    setPayments((rows) => rows.map((row) => row.method === method ? { ...row, ...patch } : row));
  }

  async function savePayment(method: PaymentMethod) {
    const setting = payments.find((row) => row.method === method);
    if (!setting) return;
    setSavingMethod(method);
    try {
      const base = getSupabaseRestUrl();
      const response = await fetch(`${base}/jmb_payment_settings?method=eq.${encodeURIComponent(method)}`, {
        method: "PATCH",
        headers: { ...getAdminAuthHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({
          detail_label: setting.detail_label,
          payment_details: setting.payment_details,
          instructions: setting.instructions,
          is_enabled: setting.is_enabled,
        }),
      });
      if (!response.ok) throw new Error(await parseError(response));
      toast.success(`${method} settings saved`);
    } catch (error) { toast.error(error instanceof Error ? error.message : `Could not save ${method}.`); }
    finally { setSavingMethod(null); }
  }

  if (loading) return <div className="grid min-h-[300px] place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-7">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Store configuration</p><h1 className="mt-1 text-3xl font-bold">Shipping & Payments</h1><p className="mt-2 text-sm text-muted-foreground">Set JMB's ship-from address and the customer-facing details for manual payment methods.</p></div>

      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3"><Truck className="size-6 text-primary" /><div><h2 className="text-xl font-bold">Ship-from address</h2><p className="text-sm text-muted-foreground">EasyPost uses this origin to calculate live customer rates.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold sm:col-span-2">Business / sender name<Input className="mt-2" value={store.ship_from_name || ""} onChange={(event) => setStore({ ...store, ship_from_name: event.target.value })} /></label>
          <label className="text-sm font-bold sm:col-span-2">Street address<Input className="mt-2" value={store.ship_from_street1 || ""} onChange={(event) => setStore({ ...store, ship_from_street1: event.target.value })} /></label>
          <label className="text-sm font-bold sm:col-span-2">Apartment / suite<Input className="mt-2" value={store.ship_from_street2 || ""} onChange={(event) => setStore({ ...store, ship_from_street2: event.target.value })} /></label>
          <label className="text-sm font-bold">City<Input className="mt-2" value={store.ship_from_city || ""} onChange={(event) => setStore({ ...store, ship_from_city: event.target.value })} /></label>
          <label className="text-sm font-bold">State<Input className="mt-2" value={store.ship_from_state || ""} onChange={(event) => setStore({ ...store, ship_from_state: event.target.value.toUpperCase() })} placeholder="CA" /></label>
          <label className="text-sm font-bold">ZIP code<Input className="mt-2" value={store.ship_from_zip || ""} onChange={(event) => setStore({ ...store, ship_from_zip: event.target.value })} /></label>
          <label className="text-sm font-bold">Country<Input className="mt-2" value={store.ship_from_country || "US"} onChange={(event) => setStore({ ...store, ship_from_country: event.target.value.toUpperCase() })} /></label>
        </div>
        <Button variant="hero" className="mt-5" onClick={() => void saveStore()} disabled={savingStore}>{savingStore ? <Loader2 className="animate-spin" /> : <Save />} Save Shipping Origin</Button>
        <p className="mt-3 text-xs text-muted-foreground">The EasyPost API key remains a private Supabase secret. Do not paste it into this page.</p>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3"><CreditCard className="size-6 text-primary" /><div><h2 className="text-xl font-bold">Payment methods</h2><p className="text-sm text-muted-foreground">Square credentials stay server-side. These fields control what customers see for manual payments.</p></div></div>
        <div className="mt-5 rounded-2xl border border-border bg-secondary/20 p-4"><p className="font-bold">Square Online Checkout</p><p className="mt-1 text-sm text-muted-foreground">Configure <code>SQUARE_ACCESS_TOKEN</code> and <code>SQUARE_LOCATION_ID</code> as Supabase Edge Function secrets. Square payments are confirmed automatically by the webhook.</p></div>
        <div className="mt-5 space-y-4">
          {MANUAL.map((method) => {
            const setting = payments.find((row) => row.method === method);
            if (!setting) return null;
            return (
              <div key={method} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{setting.logo_url && <img src={setting.logo_url} alt={`${method} logo`} className="size-10 rounded-xl bg-white object-contain p-1" />}<div><h3 className="font-bold">{method}</h3><p className="text-xs text-muted-foreground">Manual payment verification</p></div></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={setting.is_enabled} onChange={(event) => updatePayment(method, { is_enabled: event.target.checked })} className="size-4 accent-[var(--primary)]" /> Enabled</label></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold">Detail label<Input className="mt-2" value={setting.detail_label || ""} onChange={(event) => updatePayment(method, { detail_label: event.target.value })} placeholder={method === "Zelle" ? "Send Zelle to" : `${method} account`} /></label>
                  <label className="text-sm font-bold">JMB payment details<Input className="mt-2" value={setting.payment_details || ""} onChange={(event) => updatePayment(method, { payment_details: event.target.value })} placeholder="Email, phone, @handle or payment link" /></label>
                  <label className="text-sm font-bold sm:col-span-2">Extra instructions<Input className="mt-2" value={setting.instructions || ""} onChange={(event) => updatePayment(method, { instructions: event.target.value })} placeholder="Optional customer instructions" /></label>
                </div>
                <Button variant="soft" className="mt-4" onClick={() => void savePayment(method)} disabled={savingMethod === method}>{savingMethod === method ? <Loader2 className="animate-spin" /> : <Save />} Save {method}</Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
