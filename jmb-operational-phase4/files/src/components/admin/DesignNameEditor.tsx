import { PencilLine, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCTS } from "@/data/catalog";
import { deleteDesignLabel, fetchDesignLabels, labelsToMap, saveDesignLabel } from "@/lib/design-labels";

export function DesignNameEditor() {
  const [familySlug, setFamilySlug] = useState(PRODUCTS[0]?.slug ?? "cup-koozies");
  const product = useMemo(() => PRODUCTS.find((item) => item.slug === familySlug) ?? PRODUCTS[0], [familySlug]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      const map = labelsToMap(await fetchDesignLabels(familySlug));
      const next = Object.fromEntries((product?.designs ?? []).map((design) => [design.id, map[design.id] ?? design.name]));
      setNames(next);
      setSaved(map);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load design names.");
    }
  }

  useEffect(() => { void refresh(); }, [familySlug]);

  async function save(designId: string, originalName: string) {
    const displayName = (names[designId] || originalName).trim();
    if (!displayName) return toast.error("A product name cannot be blank.");
    setBusyId(designId);
    try {
      await saveDesignLabel({ family_slug: familySlug, design_id: designId, display_name: displayName });
      setSaved((current) => ({ ...current, [designId]: displayName }));
      toast.success("Product name updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the name.");
    } finally { setBusyId(null); }
  }

  async function reset(designId: string, originalName: string) {
    setBusyId(designId);
    try {
      await deleteDesignLabel(familySlug, designId);
      setNames((current) => ({ ...current, [designId]: originalName }));
      setSaved((current) => { const next = { ...current }; delete next[designId]; return next; });
      toast.success("Restored original name");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset the name.");
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Storefront labels</p><h1 className="mt-1 text-3xl font-bold">Product Name Editor</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Rename the imported catalog designs without renaming image files. Changes update customer-facing category and product pages.</p></div>
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
        <label className="text-sm font-bold">Product collection<select value={familySlug} onChange={(event) => setFamilySlug(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm sm:max-w-md">{PRODUCTS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {product?.designs.map((design) => {
            const changed = (names[design.id] ?? design.name) !== (saved[design.id] ?? design.name);
            const customized = Boolean(saved[design.id]);
            return <article key={design.id} className="rounded-[1.5rem] border border-border p-3"><img src={design.image} alt={names[design.id] ?? design.name} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" /><div className="p-2"><div className="flex items-center gap-2 text-xs text-muted-foreground"><PencilLine className="size-3" /> {design.sourceFile}</div><Input value={names[design.id] ?? design.name} onChange={(event) => setNames((current) => ({ ...current, [design.id]: event.target.value }))} className="mt-3" /><div className="mt-3 flex gap-2"><Button size="sm" variant={changed ? "hero" : "soft"} disabled={!changed || busyId === design.id} onClick={() => void save(design.id, design.name)}><Save /> Save</Button>{customized && <Button size="sm" variant="ghost" disabled={busyId === design.id} onClick={() => void reset(design.id, design.name)}><RotateCcw /> Reset</Button>}</div></div></article>;
          })}
        </div>
      </section>
    </div>
  );
}
