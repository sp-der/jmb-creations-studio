import { Check, ImagePlus, Loader2, PackagePlus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCTS } from "@/data/catalog";
import {
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

const KOOZIE_SIZES = ["12oz", "16oz", "24oz"] as const;
type KoozieSize = (typeof KOOZIE_SIZES)[number];
const emptyBySize = () => ({ "12oz": "", "16oz": "", "24oz": "" } as Record<KoozieSize, string>);

function sameDesign(item: LiveCatalogItem, name: string) {
  return item.name.trim().toLowerCase() === name.trim().toLowerCase();
}

export function CatalogManager() {
  const configured = isSupabaseCatalogConfigured();
  const session = getAdminSession();
  const [familySlug, setFamilySlug] = useState(PRODUCTS[0]?.slug ?? "cup-koozies");
  const product = useMemo(() => PRODUCTS.find((item) => item.slug === familySlug) ?? PRODUCTS[0], [familySlug]);
  const isKoozie = familySlug === "cup-koozies";
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
  const [kooziePrices, setKooziePrices] = useState<Record<KoozieSize, string>>(emptyBySize);
  const [koozieStocks, setKoozieStocks] = useState<Record<KoozieSize, string>>(() => ({ "12oz": "0", "16oz": "0", "24oz": "0" }));

  const refresh = async () => {
    if (!session || !configured) return;
    setLoading(true);
    try { setItems(await fetchLiveCatalogItems(familySlug, true)); }
    catch (error) { toast.error("Could not load catalog", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [familySlug]);

  const reset = () => {
    setName(""); setTeam(""); setSize(""); setPrice(""); setStock("1"); setMadeToOrder(false);
    setWeightOz(""); setLengthIn(""); setWidthIn(""); setHeightIn(""); setImageUrl(""); setFile(null); setEditingId(null);
    setKooziePrices(emptyBySize()); setKoozieStocks({ "12oz": "0", "16oz": "0", "24oz": "0" });
  };

  const finalImageForSave = async () => file ? uploadCatalogImage(file, familySlug, name) : imageUrl;
  const dimensions = () => ({
    weight_oz: weightOz.trim() ? Math.max(0, Number(weightOz)) : null,
    length_in: lengthIn.trim() ? Math.max(0, Number(lengthIn)) : null,
    width_in: widthIn.trim() ? Math.max(0, Number(widthIn)) : null,
    height_in: heightIn.trim() ? Math.max(0, Number(heightIn)) : null,
  });

  async function saveSingle() {
    if (!product || !name.trim()) return toast.error("Give this option a name.");
    if (price === "" || Number(price) < 0) return toast.error("Enter a price.");
    if (!imageUrl && !file) return toast.error("Attach a product image first.");
    setSaving(true);
    try {
      const finalImage = await finalImageForSave();
      const payload = {
        family_slug: familySlug, name: name.trim(), image_url: finalImage, team: team.trim() || null,
        size: size.trim() || null, price: Number(price), stock: Math.max(0, Number.parseInt(stock || "0", 10) || 0),
        made_to_order: madeToOrder, active: true,
        sort_order: editingId ? (items.find((item) => item.id === editingId)?.sort_order ?? 0) : items.length,
        ...dimensions(),
      };
      if (editingId) await updateLiveCatalogItem(editingId, payload); else await createLiveCatalogItem(payload);
      toast.success(editingId ? "Product option updated" : "Product option published"); reset(); await refresh();
    } catch (error) { toast.error("Could not save product option", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  }

  async function saveKoozieDesign() {
    if (!name.trim()) return toast.error("Name the koozie design, for example Dodgers Blue.");
    if (!imageUrl && !file) return toast.error("Attach the koozie image first.");
    const selectedSizes = KOOZIE_SIZES.filter((oz) => kooziePrices[oz] !== "");
    if (!selectedSizes.length) return toast.error("Enter a price for at least one size.");
    setSaving(true);
    try {
      const finalImage = await finalImageForSave();
      for (const [index, oz] of selectedSizes.entries()) {
        const existing = items.find((item) => sameDesign(item, name) && item.size === oz);
        const payload = {
          family_slug: familySlug, name: name.trim(), image_url: finalImage, team: team.trim() || null,
          size: oz, price: Math.max(0, Number(kooziePrices[oz]) || 0),
          stock: Math.max(0, Number.parseInt(koozieStocks[oz] || "0", 10) || 0), made_to_order: madeToOrder, active: true,
          sort_order: existing?.sort_order ?? items.length + index, ...dimensions(),
        };
        if (existing) await updateLiveCatalogItem(existing.id, payload); else await createLiveCatalogItem(payload);
      }
      toast.success("Koozie design saved", { description: `${name.trim()} now has ${selectedSizes.join(", ")} options.` });
      reset(); await refresh();
    } catch (error) { toast.error("Could not save koozie design", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  }

  const editSingle = (item: LiveCatalogItem) => {
    setEditingId(item.id); setName(item.name); setTeam(item.team ?? ""); setSize(item.size ?? ""); setPrice(String(item.price));
    setStock(String(item.stock)); setMadeToOrder(item.made_to_order); setImageUrl(item.image_url); setFile(null);
    setWeightOz(item.weight_oz == null ? "" : String(item.weight_oz)); setLengthIn(item.length_in == null ? "" : String(item.length_in));
    setWidthIn(item.width_in == null ? "" : String(item.width_in)); setHeightIn(item.height_in == null ? "" : String(item.height_in));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const koozieGroups = useMemo(() => {
    const groups = new Map<string, LiveCatalogItem[]>();
    for (const item of items) groups.set(item.name, [...(groups.get(item.name) ?? []), item]);
    return [...groups.entries()].map(([groupName, variants]) => ({ name: groupName, variants }));
  }, [items]);

  const loadKoozieGroup = (variants: LiveCatalogItem[]) => {
    const first = variants[0]; if (!first) return;
    setName(first.name); setTeam(first.team ?? ""); setImageUrl(first.image_url); setFile(null); setMadeToOrder(first.made_to_order);
    setWeightOz(first.weight_oz == null ? "" : String(first.weight_oz)); setLengthIn(first.length_in == null ? "" : String(first.length_in));
    setWidthIn(first.width_in == null ? "" : String(first.width_in)); setHeightIn(first.height_in == null ? "" : String(first.height_in));
    const prices = emptyBySize(); const stocks = { "12oz": "0", "16oz": "0", "24oz": "0" } as Record<KoozieSize, string>;
    for (const item of variants) if (KOOZIE_SIZES.includes(item.size as KoozieSize)) { const oz = item.size as KoozieSize; prices[oz] = String(item.price); stocks[oz] = String(item.stock); }
    setKooziePrices(prices); setKoozieStocks(stocks); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function remove(item: LiveCatalogItem) {
    if (!confirm(`Remove ${item.name}${item.size ? ` ${item.size}` : ""}?`)) return;
    try { await deleteLiveCatalogItem(item.id); toast.success("Removed"); await refresh(); }
    catch (error) { toast.error("Could not remove item", { description: error instanceof Error ? error.message : String(error) }); }
  }

  if (!configured) return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><h1 className="text-2xl font-bold">Catalog Manager</h1><p className="mt-2 text-sm text-muted-foreground">The browser build is missing its Supabase URL or publishable key. Add the two VITE_SUPABASE variables to the frontend environment and restart/redeploy.</p></section>;
  if (!session) return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><h1 className="text-2xl font-bold">Admin session required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in through the protected Admin page first.</p></section>;

  const ImagePicker = () => <>
    <div><Label>Attach the product image first</Label><div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{product?.designs.map((design) => <button key={design.id} type="button" onClick={() => { setImageUrl(design.image); setFile(null); if (!name) setName(design.name); }} className={`overflow-hidden rounded-xl border p-1 ${imageUrl === design.image && !file ? "border-primary ring-2 ring-primary/15" : "border-border"}`}><img src={design.image} alt={design.name} className="aspect-square w-full rounded-lg object-cover" loading="lazy" /></button>)}</div></div>
    <div className="rounded-2xl border border-dashed border-border p-4"><Label htmlFor="catalog-image" className="flex cursor-pointer items-center gap-2"><ImagePlus className="size-4 text-primary" /> Or upload a new image</Label><Input id="catalog-image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-3" onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); if (next) setImageUrl(""); }} /><p className="mt-2 text-xs text-muted-foreground">Uploads are resized and converted to WebP.</p></div>
    {(file || imageUrl) && <div className="flex items-center gap-3 rounded-2xl bg-secondary/30 p-3"><Check className="size-4 text-primary" /><span className="text-sm font-semibold">Image ready: {file?.name ?? imageUrl.split("/").pop()}</span></div>}
  </>;

  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Live storefront</p><h1 className="mt-1 text-3xl font-bold">Catalog Manager</h1><p className="mt-2 text-sm text-muted-foreground">Attach images, define customer-selectable designs, edit pricing and control ready stock.</p></div>
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><Label>Product page</Label><select value={familySlug} onChange={(e) => { setFamilySlug(e.target.value); reset(); }} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm sm:max-w-md">{PRODUCTS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></section>

    {isKoozie ? <div className="grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><PackagePlus /></span><div><h2 className="text-xl font-bold">Cup Koozie Design + Sizes</h2><p className="text-sm text-muted-foreground">Pick the team/design image first, then price the sizes JMB sells.</p></div></div><div className="mt-6 space-y-5"><ImagePicker /><div className="grid gap-4 sm:grid-cols-2"><div><Label>Design name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dodgers Blue" className="mt-2" /></div><div><Label>Team / theme</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Dodgers" className="mt-2" /></div></div><div><Label>Available sizes & pricing</Label><div className="mt-3 space-y-3">{KOOZIE_SIZES.map((oz) => <div key={oz} className="grid grid-cols-[72px_1fr_1fr] items-end gap-3 rounded-2xl bg-secondary/20 p-3"><strong className="pb-2 text-sm">{oz}</strong><label className="text-xs font-bold">Price<Input type="number" min="0" step="0.01" value={kooziePrices[oz]} onChange={(e) => setKooziePrices((v) => ({ ...v, [oz]: e.target.value }))} className="mt-1" placeholder="Leave blank if unavailable" /></label><label className="text-xs font-bold">Ready stock<Input type="number" min="0" value={koozieStocks[oz]} onChange={(e) => setKoozieStocks((v) => ({ ...v, [oz]: e.target.value }))} className="mt-1" /></label></div>)}</div></div><label className="flex items-start gap-3 rounded-2xl border border-border p-4"><input type="checkbox" checked={madeToOrder} onChange={(e) => setMadeToOrder(e.target.checked)} className="mt-1" /><span><span className="block text-sm font-bold">Made to order</span><span className="block text-xs text-muted-foreground">Allow ordering when ready stock is 0.</span></span></label><Button variant="hero" className="w-full" disabled={saving} onClick={() => void saveKoozieDesign()}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save Design & Size Pricing</Button></div></section>
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Koozie designs</h2><p className="mt-1 text-sm text-muted-foreground">Load any design to change its image or 12/16/24oz pricing.</p></div>{loading && <Loader2 className="animate-spin text-primary" />}</div><div className="mt-5 space-y-4">{koozieGroups.map((group) => <article key={group.name} className="rounded-2xl border border-border p-4"><div className="flex gap-4"><img src={group.variants[0]?.image_url} alt={group.name} className="size-24 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="font-bold">{group.name}</h3><p className="text-xs text-muted-foreground">{group.variants[0]?.team}</p><div className="mt-2 flex flex-wrap gap-2">{group.variants.sort((a,b) => KOOZIE_SIZES.indexOf(a.size as KoozieSize)-KOOZIE_SIZES.indexOf(b.size as KoozieSize)).map((variant) => <Badge key={variant.id} variant="secondary">{variant.size} • {formatCatalogPrice(variant.price)} • {variant.stock} ready</Badge>)}</div><Button size="sm" variant="soft" className="mt-3" onClick={() => loadKoozieGroup(group.variants)}>Load & Edit Design</Button></div></div></article>)}{!loading && !koozieGroups.length && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No live koozie variants yet.</p>}</div></section>
    </div> : <div className="grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><h2 className="text-xl font-bold">{editingId ? "Edit product option" : "Add product option"}</h2><div className="mt-5 space-y-5"><ImagePicker /><div className="grid gap-4 sm:grid-cols-2"><div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" /></div><div><Label>Theme / option</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} className="mt-2" /></div><div><Label>Size</Label><Input value={size} onChange={(e) => setSize(e.target.value)} className="mt-2" /></div><div><Label>Price</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2" /></div><div><Label>Ready stock</Label><Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2" /></div></div><label className="flex items-start gap-3 rounded-2xl border border-border p-4"><input type="checkbox" checked={madeToOrder} onChange={(e) => setMadeToOrder(e.target.checked)} className="mt-1" /><span className="text-sm font-bold">Made to order</span></label><div className="flex gap-2"><Button variant="hero" className="flex-1" disabled={saving} onClick={() => void saveSingle()}><Save /> {editingId ? "Save Changes" : "Publish"}</Button>{editingId && <Button variant="soft" onClick={reset}>Cancel</Button>}</div></div></section>
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><h2 className="text-xl font-bold">Published options</h2><div className="mt-5 space-y-3">{items.map((item) => <article key={item.id} className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[80px_1fr_auto] sm:items-center"><img src={item.image_url} alt={item.name} className="size-20 rounded-xl object-cover" /><div><h3 className="font-bold">{item.name}</h3><p className="text-xs text-muted-foreground">{[item.team,item.size,formatCatalogPrice(item.price),`${item.stock} ready`].filter(Boolean).join(" • ")}</p></div><div className="flex gap-2"><Button size="sm" variant="soft" onClick={() => editSingle(item)}>Edit</Button><Button size="icon-sm" variant="ghost" onClick={() => void remove(item)}><Trash2 /></Button></div></article>)}</div></section>
    </div>}
  </div>;
}
