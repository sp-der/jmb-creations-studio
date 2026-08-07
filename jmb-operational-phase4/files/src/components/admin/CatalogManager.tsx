import { Check, ImagePlus, Loader2, LogIn, PackagePlus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCTS } from "@/data/catalog";
import {
  adminSignIn,
  createLiveCatalogItem,
  deleteLiveCatalogItem,
  fetchLiveCatalogItems,
  formatCatalogPrice,
  getAdminSession,
  isSupabaseCatalogConfigured,
  updateLiveCatalogItem,
  uploadCatalogImage,
  type LiveCatalogItem,
} from "@/lib/live-catalog";

const SIZE_PRESETS = ["", "12oz", "16oz", "24oz"];

export function CatalogManager() {
  const configured = isSupabaseCatalogConfigured();
  const [session, setSession] = useState(() => getAdminSession());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [familySlug, setFamilySlug] = useState(PRODUCTS[0]?.slug ?? "cup-koozies");
  const product = useMemo(() => PRODUCTS.find((item) => item.slug === familySlug) ?? PRODUCTS[0], [familySlug]);
  const [items, setItems] = useState<LiveCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [madeToOrder, setMadeToOrder] = useState(false);
  const [weightOz, setWeightOz] = useState("");
  const [lengthIn, setLengthIn] = useState("");
  const [widthIn, setWidthIn] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = async () => {
    if (!session || !configured) return;
    setLoading(true);
    try {
      setItems(await fetchLiveCatalogItems(familySlug, true));
    } catch (error) {
      toast.error("Could not load catalog", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [familySlug, session]);

  const resetForm = () => {
    setName(""); setTeam(""); setSize(""); setPrice(""); setStock("1"); setMadeToOrder(false);
    setImageUrl(""); setFile(null); setEditingId(null);
    setWeightOz(""); setLengthIn(""); setWidthIn(""); setHeightIn("");
  };

  const signIn = async () => {
    setSigningIn(true);
    try {
      const next = await adminSignIn(email.trim(), password);
      setSession(next);
      setPassword("");
      toast.success("Catalog access unlocked");
    } catch (error) {
      toast.error("Sign-in failed", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setSigningIn(false);
    }
  };

  const save = async () => {
    if (!product) return;
    if (!name.trim()) return toast.error("Give this ready-made option a name.");
    if (!price.trim() || Number(price) < 0) return toast.error("Enter a price.");
    if (!imageUrl && !file) return toast.error("Choose an existing catalog image or upload a new image.");
    setSaving(true);
    try {
      const finalImage = file ? await uploadCatalogImage(file, familySlug, name) : imageUrl;
      const payload = {
        family_slug: familySlug,
        name: name.trim(),
        image_url: finalImage,
        team: team.trim() || null,
        size: size.trim() || null,
        price: Number(price),
        stock: Math.max(0, Number.parseInt(stock || "0", 10) || 0),
        made_to_order: madeToOrder,
        active: true,
        sort_order: editingId ? (items.find((item) => item.id === editingId)?.sort_order ?? 0) : items.length,
        weight_oz: weightOz.trim() ? Math.max(0, Number(weightOz)) : null,
        length_in: lengthIn.trim() ? Math.max(0, Number(lengthIn)) : null,
        width_in: widthIn.trim() ? Math.max(0, Number(widthIn)) : null,
        height_in: heightIn.trim() ? Math.max(0, Number(heightIn)) : null,
      };
      if (editingId) await updateLiveCatalogItem(editingId, payload);
      else await createLiveCatalogItem(payload);
      toast.success(editingId ? "Product option updated" : "Product option published", { description: `${name.trim()} is attached to ${product.name}.` });
      resetForm();
      await refresh();
    } catch (error) {
      toast.error("Could not save product option", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: LiveCatalogItem) => {
    setEditingId(item.id); setName(item.name); setTeam(item.team ?? ""); setSize(item.size ?? "");
    setPrice(String(item.price)); setStock(String(item.stock)); setMadeToOrder(item.made_to_order); setImageUrl(item.image_url); setFile(null);
    setWeightOz(item.weight_oz == null ? "" : String(item.weight_oz)); setLengthIn(item.length_in == null ? "" : String(item.length_in)); setWidthIn(item.width_in == null ? "" : String(item.width_in)); setHeightIn(item.height_in == null ? "" : String(item.height_in));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (item: LiveCatalogItem) => {
    if (!confirm(`Remove ${item.name} from the live catalog?`)) return;
    try {
      await deleteLiveCatalogItem(item.id);
      toast.success("Removed from catalog");
      await refresh();
    } catch (error) {
      toast.error("Could not remove item", { description: error instanceof Error ? error.message : String(error) });
    }
  };

  if (!configured) {
    return (
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft">
        <h1 className="text-2xl font-bold">Catalog Manager</h1>
        <p className="mt-2 text-sm text-muted-foreground">The interface is installed, but Supabase still needs to be connected before catalog changes can publish to every customer.</p>
        <div className="mt-5 rounded-2xl bg-secondary/35 p-4 text-sm">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment, then run the included <code>supabase/jmb-catalog-phase2.sql</code> in the Supabase SQL Editor.
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-xl rounded-[1.75rem] border border-border bg-card p-6 shadow-soft">
        <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><LogIn /></div>
        <h1 className="mt-4 text-2xl font-bold">Catalog Manager Sign In</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use the JMB admin account configured in Supabase Auth.</p>
        <div className="mt-6 space-y-4">
          <div><Label htmlFor="catalog-email">Email</Label><Input id="catalog-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" /></div>
          <div><Label htmlFor="catalog-password">Password</Label><Input id="catalog-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" onKeyDown={(e) => { if (e.key === "Enter") void signIn(); }} /></div>
          <Button variant="hero" className="w-full" onClick={() => void signIn()} disabled={signingIn || !email || !password}>{signingIn ? <Loader2 className="animate-spin" /> : <LogIn />} Sign In</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Live storefront</p><h1 className="mt-1 text-3xl font-bold">Catalog Manager</h1><p className="mt-2 text-sm text-muted-foreground">Attach ready-made products to a product page, set their size/team/price, or upload a new WebP image.</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><PackagePlus /></span><div><h2 className="text-xl font-bold">{editingId ? "Edit ready-made option" : "Add ready-made option"}</h2><p className="text-sm text-muted-foreground">Example: Dodgers • 16oz • $25 • 3 ready</p></div></div>
          <div className="mt-6 space-y-5">
            <div><Label>Product page</Label><select value={familySlug} onChange={(e) => { setFamilySlug(e.target.value); resetForm(); }} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{PRODUCTS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
            <div><Label htmlFor="catalog-name">Product / design name</Label><Input id="catalog-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dodgers Blue" className="mt-2" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="catalog-team">Team / theme</Label><Input id="catalog-team" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Dodgers" className="mt-2" /></div>
              <div><Label>Size</Label><select value={size} onChange={(e) => setSize(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{SIZE_PRESETS.map((value) => <option key={value || "none"} value={value}>{value || "No size / other"}</option>)}</select><Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Or type a custom size" className="mt-2" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="catalog-price">Price</Label><Input id="catalog-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00" className="mt-2" /></div>
              <div><Label htmlFor="catalog-stock">Ready stock</Label><Input id="catalog-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2" /></div>
            </div>
            <details className="rounded-2xl border border-border bg-secondary/15 p-4">
              <summary className="cursor-pointer text-sm font-bold">Shipping size & weight</summary>
              <p className="mt-2 text-xs text-muted-foreground">Optional now, but recommended. These values let checkout calculate live shipping accurately through EasyPost.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="catalog-weight">Weight (oz)</Label><Input id="catalog-weight" type="number" min="0" step="0.1" value={weightOz} onChange={(e) => setWeightOz(e.target.value)} placeholder="8" className="mt-2" /></div>
                <div><Label htmlFor="catalog-length">Length (in)</Label><Input id="catalog-length" type="number" min="0" step="0.1" value={lengthIn} onChange={(e) => setLengthIn(e.target.value)} placeholder="8" className="mt-2" /></div>
                <div><Label htmlFor="catalog-width">Width (in)</Label><Input id="catalog-width" type="number" min="0" step="0.1" value={widthIn} onChange={(e) => setWidthIn(e.target.value)} placeholder="6" className="mt-2" /></div>
                <div><Label htmlFor="catalog-height">Height (in)</Label><Input id="catalog-height" type="number" min="0" step="0.1" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="4" className="mt-2" /></div>
              </div>
            </details>

            <div><Label>Attach an existing catalog image</Label><div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{product?.designs.map((design) => <button key={design.id} type="button" onClick={() => { setImageUrl(design.image); setFile(null); if (!name) setName(design.name); }} className={`overflow-hidden rounded-xl border p-1 ${imageUrl === design.image && !file ? "border-primary ring-2 ring-primary/15" : "border-border"}`} title={design.name}><img src={design.image} alt={design.name} className="aspect-square w-full rounded-lg object-cover" loading="lazy" /></button>)}</div></div>

            <div className="rounded-2xl border border-dashed border-border p-4">
              <Label htmlFor="catalog-image" className="flex cursor-pointer items-center gap-2"><ImagePlus className="size-4 text-primary" /> Or upload a new image</Label>
              <Input id="catalog-image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-3" onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); if (next) setImageUrl(""); }} />
              <p className="mt-2 text-xs text-muted-foreground">Uploads are automatically resized and converted to WebP before they are stored.</p>
            </div>

            {(file || imageUrl) && <div className="flex items-center gap-3 rounded-2xl bg-secondary/30 p-3"><Check className="size-4 text-primary" /><span className="text-sm font-semibold">Image ready: {file?.name ?? imageUrl.split("/").pop()}</span></div>}
            <label className="flex items-start gap-3 rounded-2xl border border-border p-4"><input type="checkbox" checked={madeToOrder} onChange={(e) => setMadeToOrder(e.target.checked)} className="mt-1" /><span><span className="block text-sm font-bold">Made to order</span><span className="block text-xs text-muted-foreground">Keep this available even when ready stock reaches 0.</span></span></label>
            <div className="flex gap-3"><Button variant="hero" className="flex-1" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} {editingId ? "Save Changes" : "Publish to Product Page"}</Button>{editingId && <Button variant="soft" onClick={resetForm}>Cancel</Button>}</div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Ready-made items on {product?.name}</h2><p className="mt-1 text-sm text-muted-foreground">Customers see these as orderable choices above the custom-request option.</p></div>{loading && <Loader2 className="size-5 animate-spin text-primary" />}</div>
          <div className="mt-5 space-y-3">
            {!loading && items.length === 0 && <div className="rounded-2xl bg-secondary/30 p-6 text-center text-sm text-muted-foreground">No ready-made options have been published to this product page yet.</div>}
            {items.map((item) => <article key={item.id} className="grid gap-4 rounded-2xl border border-border p-3 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center"><img src={item.image_url} alt={item.name} className="aspect-square w-full rounded-xl object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.name}</h3>{!item.active && <Badge variant="secondary">Hidden</Badge>}{item.made_to_order && <Badge variant="secondary">Made to order</Badge>}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{item.team && <span>{item.team}</span>}{item.size && <span>{item.size}</span>}<span>{formatCatalogPrice(item.price)}</span><span>{item.stock} ready</span></div></div><div className="flex gap-2"><Button variant="soft" size="sm" onClick={() => edit(item)}>Edit</Button><Button variant="ghost" size="icon-sm" onClick={() => void remove(item)} aria-label={`Delete ${item.name}`}><Trash2 /></Button></div></article>)}
          </div>
        </section>
      </div>
    </div>
  );
}
