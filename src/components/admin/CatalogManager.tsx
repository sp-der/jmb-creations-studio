import { Check, ChevronDown, FolderPlus, ImagePlus, Loader2, PackagePlus, PencilLine, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCTS } from "@/data/catalog";
import { productFromFamily } from "@/lib/catalog-families";
import { deleteDesignLabel, fetchDesignLabels, labelsToMap, saveDesignLabel } from "@/lib/design-labels";
import {
  createCatalogFamily,
  createLiveCatalogItem,
  deleteLiveCatalogItem,
  fetchCatalogFamilies,
  fetchLiveCatalogItems,
  formatCatalogPrice,
  getAdminSession,
  isSupabaseCatalogConfigured,
  updateCatalogFamily,
  updateLiveCatalogItem,
  uploadCatalogImage,
  type LiveCatalogFamily,
  type LiveCatalogItem,
} from "@/lib/live-catalog";

const KOOZIE_SIZES = ["12oz", "16oz", "24oz"] as const;
const HEART_COLORS = ["Red", "Hot Pink", "Light Pink", "Black", "White"] as const;
type KoozieSize = (typeof KOOZIE_SIZES)[number];
const emptyBySize = () => ({ "12oz": "", "16oz": "", "24oz": "" } as Record<KoozieSize, string>);
const defaultStocks = () => ({ "12oz": "0", "16oz": "0", "24oz": "0" } as Record<KoozieSize, string>);

function sameDesign(item: LiveCatalogItem, name: string) {
  return item.name.trim().toLowerCase() === name.trim().toLowerCase();
}
function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function inferHeartColor(item: Pick<LiveCatalogItem, "team" | "name">) {
  const value = `${item.team ?? ""} ${item.name}`.toLowerCase();
  if (value.includes("hot pink")) return "Hot Pink";
  if (value.includes("light pink")) return "Light Pink";
  if (value.includes("black")) return "Black";
  if (value.includes("white")) return "White";
  if (value.includes("red")) return "Red";
  if (value.includes("pink")) return "Hot Pink";
  return item.team ?? "";
}

export function CatalogManager() {
  const configured = isSupabaseCatalogConfigured();
  const session = getAdminSession();
  const [families, setFamilies] = useState<LiveCatalogFamily[]>([]);
  const [familySlug, setFamilySlug] = useState(PRODUCTS[0]?.slug ?? "cup-koozies");
  const selectedFamily = useMemo(() => families.find((family) => family.slug === familySlug) ?? null, [families, familySlug]);
  const product = useMemo(() => selectedFamily ? productFromFamily(selectedFamily) : PRODUCTS.find((item) => item.slug === familySlug), [selectedFamily, familySlug]);
  const isKoozie = familySlug === "cup-koozies";
  const isHeartStand = familySlug === "heart-phone-stands";
  const [items, setItems] = useState<LiveCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryImage, setCategoryImage] = useState("");
  const [categoryFile, setCategoryFile] = useState<File | null>(null);
  const [categoryActive, setCategoryActive] = useState(true);
  const [categoryCustomizable, setCategoryCustomizable] = useState(true);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryFile, setNewCategoryFile] = useState<File | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [kooziePrices, setKooziePrices] = useState<Record<KoozieSize, string>>(emptyBySize);
  const [koozieStocks, setKoozieStocks] = useState<Record<KoozieSize, string>>(defaultStocks);
  const [designNames, setDesignNames] = useState<Record<string, string>>({});
  const [savedDesignNames, setSavedDesignNames] = useState<Record<string, string>>({});
  const [busyDesignId, setBusyDesignId] = useState<string | null>(null);

  async function loadFamilies(preferredSlug?: string) {
    if (!session || !configured) return;
    try {
      const rows = await fetchCatalogFamilies(true);
      setFamilies(rows);
      const preferred = preferredSlug && rows.some((row) => row.slug === preferredSlug) ? preferredSlug : undefined;
      const currentStillExists = rows.some((row) => row.slug === familySlug);
      if (preferred) setFamilySlug(preferred);
      else if (!currentStillExists && rows[0]) setFamilySlug(rows[0].slug);
    } catch (error) {
      toast.error("Could not load categories", { description: error instanceof Error ? error.message : String(error) });
    }
  }

  async function refresh() {
    if (!session || !configured || !familySlug) return;
    setLoading(true);
    try { setItems(await fetchLiveCatalogItems(familySlug, true)); }
    catch (error) { toast.error("Could not load catalog", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setLoading(false); }
  }

  async function refreshLabels() {
    if (!familySlug) return;
    try {
      const labels = labelsToMap(await fetchDesignLabels(familySlug));
      setSavedDesignNames(labels);
      setDesignNames(Object.fromEntries((product?.designs ?? []).map((design) => [design.id, labels[design.id] ?? design.name])));
    } catch {
      setSavedDesignNames({});
      setDesignNames(Object.fromEntries((product?.designs ?? []).map((design) => [design.id, design.name])));
    }
  }

  useEffect(() => { void loadFamilies(); }, []);
  useEffect(() => { void refresh(); void refreshLabels(); }, [familySlug]);
  useEffect(() => {
    if (!selectedFamily) return;
    setCategoryName(selectedFamily.name);
    setCategoryDescription(selectedFamily.description ?? "");
    setCategoryImage(selectedFamily.image_url ?? product?.mainImage ?? "");
    setCategoryFile(null);
    setCategoryActive(selectedFamily.active);
    setCategoryCustomizable(selectedFamily.customizable);
  }, [selectedFamily?.id, product?.mainImage]);

  const reset = () => {
    setName(""); setDescription(""); setTeam(""); setSize(""); setPrice(""); setStock("1"); setMadeToOrder(false);
    setWeightOz(""); setLengthIn(""); setWidthIn(""); setHeightIn(""); setImageUrl(""); setFile(null); setEditingId(null); setSelectedDesignId(null);
    setKooziePrices(emptyBySize()); setKoozieStocks(defaultStocks());
  };

  const finalImageForSave = async () => file ? uploadCatalogImage(file, familySlug, name || team || "product") : imageUrl;
  const dimensions = () => ({
    weight_oz: weightOz.trim() ? Math.max(0, Number(weightOz)) : null,
    length_in: lengthIn.trim() ? Math.max(0, Number(lengthIn)) : null,
    width_in: widthIn.trim() ? Math.max(0, Number(widthIn)) : null,
    height_in: heightIn.trim() ? Math.max(0, Number(heightIn)) : null,
  });

  async function syncImportedLabel(displayName: string, finalImage: string) {
    const imported = (product?.designs ?? []).find((design) => design.id === selectedDesignId || design.image === finalImage);
    if (!imported) return;
    await saveDesignLabel({ family_slug: familySlug, design_id: imported.id, display_name: displayName });
    setSavedDesignNames((current) => ({ ...current, [imported.id]: displayName }));
    setDesignNames((current) => ({ ...current, [imported.id]: displayName }));
  }

  async function saveSingle() {
    if (!name.trim()) return toast.error("Give this product a name.");
    if (price === "" || Number(price) < 0) return toast.error("Enter a price.");
    if (!imageUrl && !file) return toast.error("Attach a product image first.");
    if (isHeartStand && !HEART_COLORS.includes(team as (typeof HEART_COLORS)[number])) return toast.error("Choose one of the five Heart Phone Stand colors.");
    setSaving(true);
    try {
      const finalImage = await finalImageForSave();
      const finalName = isHeartStand ? "Heart Phone Stand" : name.trim();
      const payload = {
        family_slug: familySlug, name: finalName, description: description.trim() || null, image_url: finalImage, team: team.trim() || null,
        size: size.trim() || null, price: Number(price), stock: Math.max(0, Number.parseInt(stock || "0", 10) || 0),
        made_to_order: madeToOrder, active: true,
        sort_order: editingId ? (items.find((item) => item.id === editingId)?.sort_order ?? 0) : items.length,
        ...dimensions(),
      };
      if (editingId) await updateLiveCatalogItem(editingId, payload); else await createLiveCatalogItem(payload);
      await syncImportedLabel(isHeartStand ? `${team} Heart Phone Stand` : name.trim(), finalImage);
      toast.success(editingId ? "Product updated" : "Product published"); reset(); await refresh();
    } catch (error) { toast.error("Could not save product", { description: error instanceof Error ? error.message : String(error) }); }
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
          family_slug: familySlug, name: name.trim(), description: description.trim() || null, image_url: finalImage, team: team.trim() || null,
          size: oz, price: Math.max(0, Number(kooziePrices[oz]) || 0),
          stock: Math.max(0, Number.parseInt(koozieStocks[oz] || "0", 10) || 0), made_to_order: madeToOrder, active: true,
          sort_order: existing?.sort_order ?? items.length + index, ...dimensions(),
        };
        if (existing) await updateLiveCatalogItem(existing.id, payload); else await createLiveCatalogItem(payload);
      }
      await syncImportedLabel(name.trim(), finalImage);
      toast.success("Koozie design saved", { description: `${name.trim()} now has ${selectedSizes.join(", ")} options.` });
      reset(); await refresh();
    } catch (error) { toast.error("Could not save koozie design", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  }

  async function saveCategory() {
    if (!selectedFamily) return toast.error("Run the Phase 13 SQL first so this category can be managed from Supabase.");
    if (!categoryName.trim()) return toast.error("Category name is required.");
    setSaving(true);
    try {
      const nextImage = categoryFile ? await uploadCatalogImage(categoryFile, selectedFamily.slug, `${categoryName}-category`) : categoryImage;
      await updateCatalogFamily(selectedFamily.id, {
        slug: selectedFamily.slug,
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
        image_url: nextImage || null,
        customizable: categoryCustomizable,
        active: categoryActive,
        sort_order: selectedFamily.sort_order,
      });
      toast.success("Category updated");
      setCategoryFile(null);
      await loadFamilies(selectedFamily.slug);
    } catch (error) { toast.error("Could not save category", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  }

  async function createCategory() {
    const nameValue = newCategoryName.trim();
    const slugValue = slugify(newCategorySlug.trim() || nameValue);
    if (!nameValue || !slugValue) return toast.error("Enter a category name.");
    setSaving(true);
    try {
      const image = newCategoryFile ? await uploadCatalogImage(newCategoryFile, slugValue, `${nameValue}-category`) : null;
      await createCatalogFamily({
        slug: slugValue,
        name: nameValue,
        description: newCategoryDescription.trim() || null,
        image_url: image,
        customizable: true,
        active: true,
        sort_order: families.length,
      });
      toast.success("Category created", { description: `${nameValue} is ready for products.` });
      setCreatingCategory(false); setNewCategoryName(""); setNewCategorySlug(""); setNewCategoryDescription(""); setNewCategoryFile(null);
      await loadFamilies(slugValue);
    } catch (error) { toast.error("Could not create category", { description: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  }

  const editSingle = (item: LiveCatalogItem) => {
    setEditingId(item.id); setName(isHeartStand ? "Heart Phone Stand" : item.name); setDescription(item.description ?? ""); setTeam(isHeartStand ? inferHeartColor(item) : (item.team ?? "")); setSize(item.size ?? ""); setPrice(String(item.price));
    setStock(String(item.stock)); setMadeToOrder(item.made_to_order); setImageUrl(item.image_url); setFile(null);
    setSelectedDesignId((product?.designs ?? []).find((design) => design.image === item.image_url)?.id ?? null);
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
    setName(first.name); setDescription(first.description ?? ""); setTeam(first.team ?? ""); setImageUrl(first.image_url); setFile(null); setMadeToOrder(first.made_to_order);
    setSelectedDesignId((product?.designs ?? []).find((design) => design.image === first.image_url)?.id ?? null);
    setWeightOz(first.weight_oz == null ? "" : String(first.weight_oz)); setLengthIn(first.length_in == null ? "" : String(first.length_in));
    setWidthIn(first.width_in == null ? "" : String(first.width_in)); setHeightIn(first.height_in == null ? "" : String(first.height_in));
    const prices = emptyBySize(); const stocks = defaultStocks();
    for (const item of variants) if (KOOZIE_SIZES.includes(item.size as KoozieSize)) { const oz = item.size as KoozieSize; prices[oz] = String(item.price); stocks[oz] = String(item.stock); }
    setKooziePrices(prices); setKoozieStocks(stocks); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function remove(item: LiveCatalogItem) {
    if (!confirm(`Remove ${item.name}${item.team ? ` • ${item.team}` : ""}${item.size ? ` • ${item.size}` : ""}?`)) return;
    try { await deleteLiveCatalogItem(item.id); toast.success("Removed"); await refresh(); }
    catch (error) { toast.error("Could not remove item", { description: error instanceof Error ? error.message : String(error) }); }
  }

  async function saveImportedName(designId: string, originalName: string) {
    const displayName = (designNames[designId] || originalName).trim();
    if (!displayName) return toast.error("A product name cannot be blank.");
    setBusyDesignId(designId);
    try {
      await saveDesignLabel({ family_slug: familySlug, design_id: designId, display_name: displayName });
      setSavedDesignNames((current) => ({ ...current, [designId]: displayName }));
      toast.success("Gallery name updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the name."); }
    finally { setBusyDesignId(null); }
  }

  async function resetImportedName(designId: string, originalName: string) {
    setBusyDesignId(designId);
    try {
      await deleteDesignLabel(familySlug, designId);
      setDesignNames((current) => ({ ...current, [designId]: originalName }));
      setSavedDesignNames((current) => { const next = { ...current }; delete next[designId]; return next; });
      toast.success("Original gallery name restored");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not reset the name."); }
    finally { setBusyDesignId(null); }
  }

  if (!configured) return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><h1 className="text-2xl font-bold">Catalog Manager</h1><p className="mt-2 text-sm text-muted-foreground">The browser build is missing its Supabase URL or publishable key.</p></section>;
  if (!session) return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><h1 className="text-2xl font-bold">Admin session required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in through the protected Admin page first.</p></section>;

  const ImagePicker = () => <>
    {(product?.designs?.length ?? 0) > 0 && <div><Label>Existing gallery image</Label><div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{product?.designs.map((design) => <button key={design.id} type="button" onClick={() => { setImageUrl(design.image); setFile(null); setSelectedDesignId(design.id); if (!name || isHeartStand) setName(isHeartStand ? "Heart Phone Stand" : (designNames[design.id] ?? design.name)); }} className={`overflow-hidden rounded-xl border p-1 ${imageUrl === design.image && !file ? "border-primary ring-2 ring-primary/15" : "border-border"}`}><img src={design.image} alt={designNames[design.id] ?? design.name} className="aspect-square w-full rounded-lg object-cover" loading="lazy" /></button>)}</div></div>}
    <div className="rounded-2xl border border-dashed border-border p-4"><Label htmlFor="catalog-image" className="flex cursor-pointer items-center gap-2"><ImagePlus className="size-4 text-primary" /> Upload product image</Label><Input id="catalog-image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-3" onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); setSelectedDesignId(null); if (next) setImageUrl(""); }} /><p className="mt-2 text-xs text-muted-foreground">Uploads are resized and converted to WebP.</p></div>
    {(file || imageUrl) && <div className="flex items-center gap-3 rounded-2xl bg-secondary/30 p-3"><Check className="size-4 text-primary" /><span className="text-sm font-semibold">Image ready: {file?.name ?? imageUrl.split("/").pop()}</span></div>}
  </>;

  const PackageDetails = () => <details className="rounded-2xl border border-border p-4"><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">Package weight & dimensions <ChevronDown className="size-4" /></summary><p className="mt-2 text-xs text-muted-foreground">Used for live shipping calculations. Leave blank until packaging is measured.</p><div className="mt-4 grid gap-3 sm:grid-cols-4"><label className="text-xs font-bold">Weight (oz)<Input type="number" min="0" step="0.1" value={weightOz} onChange={(e) => setWeightOz(e.target.value)} className="mt-1" /></label><label className="text-xs font-bold">Length (in)<Input type="number" min="0" step="0.1" value={lengthIn} onChange={(e) => setLengthIn(e.target.value)} className="mt-1" /></label><label className="text-xs font-bold">Width (in)<Input type="number" min="0" step="0.1" value={widthIn} onChange={(e) => setWidthIn(e.target.value)} className="mt-1" /></label><label className="text-xs font-bold">Height (in)<Input type="number" min="0" step="0.1" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className="mt-1" /></label></div></details>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Main manager</p><h1 className="mt-1 text-3xl font-bold">Catalog</h1><p className="mt-2 text-sm text-muted-foreground">Categories, category images, product photos, names, prices and stock all live here.</p></div><Button variant="soft" onClick={() => setCreatingCategory((value) => !value)}><FolderPlus /> New Category</Button></div>

    {creatingCategory && <section className="rounded-[1.75rem] border border-primary/25 bg-secondary/20 p-5 shadow-soft sm:p-6"><h2 className="text-xl font-bold">Create category</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Category name<Input value={newCategoryName} onChange={(e) => { setNewCategoryName(e.target.value); setNewCategorySlug(slugify(e.target.value)); }} className="mt-2" placeholder="Keychains" /></label><label className="text-sm font-bold">URL slug<Input value={newCategorySlug} onChange={(e) => setNewCategorySlug(slugify(e.target.value))} className="mt-2" placeholder="keychains" /></label></div><label className="mt-4 block text-sm font-bold">Description<Input value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} className="mt-2" /></label><label className="mt-4 block text-sm font-bold">Category image<Input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2" onChange={(e) => setNewCategoryFile(e.target.files?.[0] ?? null)} /></label><div className="mt-5 flex gap-2"><Button variant="hero" disabled={saving} onClick={() => void createCategory()}>{saving ? <Loader2 className="animate-spin" /> : <FolderPlus />} Create Category</Button><Button variant="ghost" onClick={() => setCreatingCategory(false)}>Cancel</Button></div></section>}

    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div className="flex flex-wrap items-end gap-3"><label className="min-w-[260px] flex-1 text-sm font-bold">Category<select value={familySlug} onChange={(e) => { setFamilySlug(e.target.value); reset(); }} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">{(families.length ? families : PRODUCTS.map((item, index) => ({ id: item.id, slug: item.slug, name: item.name, description: item.description, image_url: item.mainImage, customizable: item.customizable, active: true, sort_order: index } as LiveCatalogFamily))).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><Badge variant="secondary">{items.filter((item) => item.active).length} live options</Badge></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]"><div><img src={categoryFile ? URL.createObjectURL(categoryFile) : (categoryImage || product?.mainImage || "/logo.png")} alt="Category" className="aspect-[4/5] w-full rounded-2xl border border-border object-cover" /></div><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Category name<Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="mt-2" /></label><label className="text-sm font-bold">Replace category image<Input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2" onChange={(e) => setCategoryFile(e.target.files?.[0] ?? null)} /></label></div><label className="block text-sm font-bold">Description<Input value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} className="mt-2" /></label><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={categoryActive} onChange={(e) => setCategoryActive(e.target.checked)} /> Show category</label><label className="flex items-center gap-2"><input type="checkbox" checked={categoryCustomizable} onChange={(e) => setCategoryCustomizable(e.target.checked)} /> Custom requests allowed</label></div><Button variant="soft" disabled={saving || !selectedFamily} onClick={() => void saveCategory()}><Save /> Save Category</Button></div></div>
    </section>

    {isKoozie ? <div className="grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><PackagePlus /></span><div><h2 className="text-xl font-bold">Cup Koozie Design + Sizes</h2><p className="text-sm text-muted-foreground">Choose the design image, name it once, then set 12/16/24oz pricing.</p></div></div><div className="mt-6 space-y-5"><ImagePicker /><div className="grid gap-4 sm:grid-cols-2"><div><Label>Design name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dodgers Blue" className="mt-2" /></div><div><Label>Team / theme</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Dodgers" className="mt-2" /></div></div><div><Label>Product description</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Add dimensions, materials, fit notes, what is included, or anything customers should know." className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div><div><Label>Available sizes & pricing</Label><div className="mt-3 space-y-3">{KOOZIE_SIZES.map((oz) => <div key={oz} className="grid grid-cols-[72px_1fr_1fr] items-end gap-3 rounded-2xl bg-secondary/20 p-3"><strong className="pb-2 text-sm">{oz}</strong><label className="text-xs font-bold">Price<Input type="number" min="0" step="0.01" value={kooziePrices[oz]} onChange={(e) => setKooziePrices((v) => ({ ...v, [oz]: e.target.value }))} className="mt-1" placeholder="Unavailable" /></label><label className="text-xs font-bold">Ready stock<Input type="number" min="0" value={koozieStocks[oz]} onChange={(e) => setKoozieStocks((v) => ({ ...v, [oz]: e.target.value }))} className="mt-1" /></label></div>)}</div></div><label className="flex items-start gap-3 rounded-2xl border border-border p-4"><input type="checkbox" checked={madeToOrder} onChange={(e) => setMadeToOrder(e.target.checked)} className="mt-1" /><span><span className="block text-sm font-bold">Made to order</span><span className="block text-xs text-muted-foreground">Allow ordering when ready stock is 0.</span></span></label><PackageDetails /><Button variant="hero" className="w-full" disabled={saving} onClick={() => void saveKoozieDesign()}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save Design & Size Pricing</Button></div></section>
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Koozie designs</h2><p className="mt-1 text-sm text-muted-foreground">Edit image, product name, team and size pricing here.</p></div>{loading && <Loader2 className="animate-spin text-primary" />}</div><div className="mt-5 space-y-4">{koozieGroups.map((group) => <article key={group.name} className="rounded-2xl border border-border p-4"><div className="flex gap-4"><img src={group.variants[0]?.image_url} alt={group.name} className="size-24 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="font-bold">{group.name}</h3><p className="text-xs text-muted-foreground">{group.variants[0]?.team}</p><div className="mt-2 flex flex-wrap gap-2">{group.variants.sort((a,b) => KOOZIE_SIZES.indexOf(a.size as KoozieSize)-KOOZIE_SIZES.indexOf(b.size as KoozieSize)).map((variant) => <Badge key={variant.id} variant="secondary">{variant.size} • {formatCatalogPrice(variant.price)} • {variant.stock} ready</Badge>)}</div><Button size="sm" variant="soft" className="mt-3" onClick={() => loadKoozieGroup(group.variants)}>Load & Edit</Button></div></div></article>)}{!loading && !koozieGroups.length && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No live koozie variants yet.</p>}</div></section>
    </div> : <div className="grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><h2 className="text-xl font-bold">{editingId ? "Edit product" : "Add product"}</h2><div className="mt-5 space-y-5"><ImagePicker /><div className="grid gap-4 sm:grid-cols-2">{!isHeartStand && <div><Label>Product name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" /></div>}{isHeartStand ? <div><Label>Color</Label><select value={team} onChange={(e) => { setTeam(e.target.value); setName("Heart Phone Stand"); }} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Choose color</option>{HEART_COLORS.map((color) => <option key={color}>{color}</option>)}</select></div> : <div><Label>Theme / option</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} className="mt-2" /></div>}<div><Label>Size / variation</Label><Input value={size} onChange={(e) => setSize(e.target.value)} className="mt-2" /></div><div><Label>Price</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2" /></div><div><Label>Ready stock</Label><Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2" /></div></div><div><Label>Product description</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Add dimensions, materials, fit notes, what is included, or anything customers should know." className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div><label className="flex items-start gap-3 rounded-2xl border border-border p-4"><input type="checkbox" checked={madeToOrder} onChange={(e) => setMadeToOrder(e.target.checked)} className="mt-1" /><span className="text-sm font-bold">Made to order</span></label><PackageDetails /><div className="flex gap-2"><Button variant="hero" className="flex-1" disabled={saving} onClick={() => void saveSingle()}><Save /> {editingId ? "Save Changes" : "Publish Product"}</Button>{editingId && <Button variant="soft" onClick={reset}>Cancel</Button>}</div></div></section>
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Published products</h2>{loading && <Loader2 className="animate-spin text-primary" />}</div><div className="mt-5 space-y-3">{items.map((item) => <article key={item.id} className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[80px_1fr_auto] sm:items-center"><img src={item.image_url} alt={item.name} className="size-20 rounded-xl object-cover" /><div><h3 className="font-bold">{isHeartStand ? `${inferHeartColor(item)} Heart Phone Stand` : item.name}</h3><p className="text-xs text-muted-foreground">{[!isHeartStand && item.team,item.size,formatCatalogPrice(item.price),`${item.stock} ready`].filter(Boolean).join(" • ")}</p>{item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}</div><div className="flex gap-2"><Button size="sm" variant="soft" onClick={() => editSingle(item)}>Edit</Button><Button size="icon-sm" variant="ghost" onClick={() => void remove(item)}><Trash2 /></Button></div></article>)}</div></section>
    </div>}

    {(product?.designs?.length ?? 0) > 0 && <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Imported gallery</p><h2 className="mt-1 text-xl font-bold">Gallery names</h2><p className="mt-1 text-sm text-muted-foreground">The old Product Name Editor now lives here. Rename imported images without touching their filenames.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{product?.designs.map((design) => { const changed = (designNames[design.id] ?? design.name) !== (savedDesignNames[design.id] ?? design.name); const customized = Boolean(savedDesignNames[design.id]); return <article key={design.id} className="rounded-[1.4rem] border border-border p-3"><img src={design.image} alt={designNames[design.id] ?? design.name} className="aspect-[4/5] w-full rounded-xl object-cover" loading="lazy" /><div className="p-2"><div className="flex items-center gap-2 text-xs text-muted-foreground"><PencilLine className="size-3" /> {design.sourceFile}</div><Input value={designNames[design.id] ?? design.name} onChange={(e) => setDesignNames((current) => ({ ...current, [design.id]: e.target.value }))} className="mt-3" /><div className="mt-3 flex gap-2"><Button size="sm" variant={changed ? "hero" : "soft"} disabled={!changed || busyDesignId === design.id} onClick={() => void saveImportedName(design.id, design.name)}><Save /> Save</Button>{customized && <Button size="sm" variant="ghost" disabled={busyDesignId === design.id} onClick={() => void resetImportedName(design.id, design.name)}><RotateCcw /> Reset</Button>}</div></div></article>; })}</div></section>}
  </div>;
}
