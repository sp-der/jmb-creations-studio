import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Minus, PackageCheck, Plus, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProduct, relatedProducts } from "@/data/catalog";
import { formatPrice, useCart } from "@/lib/cart";
import { fetchLiveCatalogItems, type LiveCatalogItem } from "@/lib/live-catalog";
import { useDesignLabels } from "@/lib/use-design-labels";

export const Route = createFileRoute("/product/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ design: typeof search.design === "string" ? search.design : undefined }),
  component: ProductDetailPage,
});

const KOOZIE_SIZE_ORDER = ["12oz", "16oz", "24oz"];

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { design } = Route.useSearch();
  const product = getProduct(slug);
  const { addItem } = useCart();
  const designLabels = useDesignLabels(product?.slug);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [readyItems, setReadyItems] = useState<LiveCatalogItem[]>([]);
  const [selectedReadyId, setSelectedReadyId] = useState<string | null>(null);
  const [selectedKoozieDesign, setSelectedKoozieDesign] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product || !design) return;
    const index = product.designs.findIndex((item) => item.slug === design);
    if (index >= 0) setSelectedIndex(index);
  }, [product, design]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    fetchLiveCatalogItems(product.slug).then((items) => { if (!cancelled) setReadyItems(items); }).catch(() => { if (!cancelled) setReadyItems([]); });
    return () => { cancelled = true; };
  }, [product]);

  const koozieGroups = useMemo(() => {
    const groups = new Map<string, LiveCatalogItem[]>();
    for (const item of readyItems) groups.set(item.name, [...(groups.get(item.name) ?? []), item]);
    return [...groups.entries()].map(([name, variants]) => ({
      name,
      variants: [...variants].sort((a, b) => KOOZIE_SIZE_ORDER.indexOf(a.size ?? "") - KOOZIE_SIZE_ORDER.indexOf(b.size ?? "")),
      image: variants[0]?.image_url ?? "",
      team: variants[0]?.team ?? null,
    }));
  }, [readyItems]);

  const related = useMemo(() => (product ? relatedProducts(product, 3) : []), [product]);
  if (!product) return <StoreLayout><div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-3xl font-bold">Product not found</h1><Button variant="hero" className="mt-6" asChild><Link to="/shop">Back to Shop</Link></Button></div></StoreLayout>;

  const isKoozie = product.slug === "cup-koozies";
  const designs = product.designs;
  const selected = designs[selectedIndex] ?? designs[0];
  const selectedReady = readyItems.find((item) => item.id === selectedReadyId) ?? null;
  const selectedGroup = isKoozie ? koozieGroups.find((group) => group.name === selectedKoozieDesign) ?? null : null;
  const displayDesignName = (item: (typeof designs)[number] | undefined) => item ? (designLabels[item.id] ?? item.name) : product.name;
  const currentImage = selectedReady?.image_url ?? selectedGroup?.image ?? selected?.image ?? product.mainImage;
  const currentAlt = selectedReady?.name ?? selectedGroup?.name ?? displayDesignName(selected);

  const move = (direction: number) => {
    if (!designs.length) return;
    setSelectedReadyId(null); setSelectedKoozieDesign(null);
    setSelectedIndex((current) => (current + direction + designs.length) % designs.length);
  };

  const chooseReady = (item: LiveCatalogItem) => {
    setSelectedReadyId(item.id);
    const staticIndex = designs.findIndex((designItem) => designItem.image === item.image_url);
    if (staticIndex >= 0) setSelectedIndex(staticIndex);
  };

  const chooseKoozieDesign = (group: (typeof koozieGroups)[number]) => {
    setSelectedKoozieDesign(group.name); setSelectedReadyId(null); setQuantity(1);
    const staticIndex = designs.findIndex((designItem) => designItem.image === group.image);
    if (staticIndex >= 0) setSelectedIndex(staticIndex);
  };

  const addReadyToCart = () => {
    if (!selectedReady) return;
    if (!selectedReady.made_to_order && selectedReady.stock <= 0) return;
    addItem({
      productId: selectedReady.id,
      name: `${product.name} - ${selectedReady.name}`,
      slug: product.slug,
      category: product.category,
      price: Number(selectedReady.price),
      quantity,
      color: selectedReady.team ?? "",
      option: selectedReady.size ?? "",
      personalization: "",
      note: selectedReady.made_to_order ? "Made to order" : "Ready-made catalog item",
      imageUrl: selectedReady.image_url,
      weightOz: selectedReady.weight_oz,
      lengthIn: selectedReady.length_in,
      widthIn: selectedReady.width_in,
      heightIn: selectedReady.height_in,
    });
    toast.success("Added to cart", { description: `${quantity} × ${selectedReady.name}${selectedReady.size ? ` • ${selectedReady.size}` : ""}` });
  };

  const customDesign = selectedReady?.name ?? selectedGroup?.name ?? (selected ? displayDesignName(selected) : "");
  const customHref = `/custom-orders?product=${encodeURIComponent(product.name)}${customDesign ? `&design=${encodeURIComponent(customDesign)}` : ""}`;

  return <StoreLayout>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Button variant="soft" size="sm" asChild><Link to="/shop"><ArrowLeft aria-hidden /> Back to Products</Link></Button>
      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)]">
        <section>
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-lift"><img src={currentImage} alt={currentAlt} className="aspect-[4/5] w-full rounded-[1.5rem] object-cover" />{designs.length > 1 && !selectedReady && !selectedGroup && <><Button type="button" variant="soft" size="icon" className="absolute left-7 top-1/2 -translate-y-1/2" onClick={() => move(-1)}><ChevronLeft /></Button><Button type="button" variant="soft" size="icon" className="absolute right-7 top-1/2 -translate-y-1/2" onClick={() => move(1)}><ChevronRight /></Button></>}</div>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">{designs.map((item, index) => <button key={item.id} type="button" onClick={() => { setSelectedReadyId(null); setSelectedKoozieDesign(null); setSelectedIndex(index); }} className={`overflow-hidden rounded-xl border p-1 ${!selectedReady && !selectedGroup && selectedIndex === index ? "border-primary ring-2 ring-primary/15" : "border-border"}`}><img src={item.image} alt={displayDesignName(item)} className="aspect-[4/5] w-full rounded-lg object-cover" loading="lazy" /></button>)}</div>
        </section>

        <section>
          <Badge className="rounded-full bg-gradient-plum text-primary-foreground">{product.category}</Badge>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{product.description}</p>
          <ul className="mt-5 space-y-2">{product.details.map((detail) => <li key={detail} className="flex gap-3 text-sm"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Check className="size-3" /></span>{detail}</li>)}</ul>

          {readyItems.length > 0 && <div className="mt-7 rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
            {isKoozie ? <>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ready to order</p><h2 className="mt-1 text-xl font-bold">1. Choose your koozie design</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{koozieGroups.map((group) => <button key={group.name} type="button" onClick={() => chooseKoozieDesign(group)} className={`flex gap-3 rounded-2xl border p-3 text-left transition-all ${selectedGroup?.name === group.name ? "border-primary bg-secondary/35 ring-2 ring-primary/15" : "border-border hover:bg-secondary/20"}`}><img src={group.image} alt={group.name} className="size-20 rounded-xl object-cover" /><span><span className="block font-bold">{group.name}</span>{group.team && <span className="mt-1 block text-xs text-muted-foreground">{group.team}</span>}<span className="mt-2 block text-[11px] text-muted-foreground">{group.variants.map((v) => v.size).filter(Boolean).join(" • ")}</span></span></button>)}</div>
              {selectedGroup && <div className="mt-6 border-t border-border pt-5"><h3 className="text-lg font-bold">2. Choose your size</h3><div className="mt-3 grid grid-cols-3 gap-3">{selectedGroup.variants.map((item) => { const unavailable = !item.made_to_order && item.stock <= 0; const active = selectedReadyId === item.id; return <button key={item.id} type="button" disabled={unavailable} onClick={() => setSelectedReadyId(item.id)} className={`rounded-2xl border p-3 text-center disabled:opacity-45 ${active ? "border-primary bg-secondary/35 ring-2 ring-primary/15" : "border-border"}`}><strong className="block">{item.size ?? "Standard"}</strong><span className="mt-1 block text-sm font-bold text-primary">{formatPrice(item.price)}</span><span className="mt-1 block text-[10px] text-muted-foreground">{item.made_to_order ? "Made to order" : `${item.stock} ready`}</span></button>; })}</div></div>}
            </> : <><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ready to order</p><h2 className="mt-1 text-xl font-bold">Choose an available option</h2></div><Badge variant="secondary">{readyItems.length} listed</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{readyItems.map((item) => { const unavailable = !item.made_to_order && item.stock <= 0; const active = selectedReadyId === item.id; return <button key={item.id} type="button" disabled={unavailable} onClick={() => chooseReady(item)} className={`flex gap-3 rounded-2xl border p-3 text-left disabled:opacity-50 ${active ? "border-primary bg-secondary/35 ring-2 ring-primary/15" : "border-border"}`}><img src={item.image_url} alt={item.name} className="size-20 rounded-xl object-cover" /><span><span className="block font-bold">{item.name}</span><span className="mt-1 block text-xs text-muted-foreground">{[item.team,item.size].filter(Boolean).join(" • ")}</span><span className="mt-2 block font-bold text-primary">{formatPrice(item.price)}</span></span></button>; })}</div></>}

            {selectedReady && <div className="mt-5 rounded-2xl bg-secondary/25 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{selectedReady.name}</p><p className="text-sm text-muted-foreground">{[selectedReady.team, selectedReady.size].filter(Boolean).join(" • ")} {selectedReady.made_to_order ? "• Made to order" : `• ${selectedReady.stock} ready`}</p></div><p className="font-display text-2xl font-bold text-primary">{formatPrice(selectedReady.price)}</p></div><div className="mt-4 flex flex-wrap gap-3"><div className="flex items-center gap-2 rounded-full border border-border bg-background p-1"><Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus /></Button><span className="min-w-8 text-center font-bold">{quantity}</span><Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuantity((value) => Math.min(selectedReady.made_to_order ? 99 : Math.max(1, selectedReady.stock), value + 1))}><Plus /></Button></div><Button variant="hero" className="min-w-48 flex-1" onClick={addReadyToCart}><ShoppingBag /> Add to Cart</Button></div></div>}
          </div>}

          <div className="mt-5 rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6"><h2 className="text-lg font-bold">Want different colors, a different team, or something completely custom?</h2><p className="mt-1 text-sm text-muted-foreground">Start a custom chat with JMB and request colors, size, theme, wording, or a design that is not already listed.</p><Button variant="hero" className="mt-5 w-full" asChild><a href={customHref}><Sparkles aria-hidden /> Customize This / Start a Chat</a></Button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-secondary/35 p-4 text-center"><Truck className="mx-auto size-5 text-primary" /><p className="mt-2 text-xs font-bold">Shipping available</p></div><div className="rounded-2xl bg-secondary/35 p-4 text-center"><PackageCheck className="mx-auto size-5 text-primary" /><p className="mt-2 text-xs font-bold">Local pickup</p></div></div>
          {product.safety && <div className="mt-5 rounded-2xl border border-border p-5 text-sm"><strong>Safety:</strong> <span className="text-muted-foreground">{product.safety}</span></div>}
        </section>
      </div>

      <section className="mt-16 border-t border-border pt-12"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Available collection</p><h2 className="mt-2 text-3xl font-bold">All {product.name} Designs</h2><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{designs.map((item, index) => <button key={item.id} type="button" onClick={() => { setSelectedReadyId(null); setSelectedKoozieDesign(null); setSelectedIndex(index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-[1.5rem] border border-border bg-card p-3 text-left shadow-soft transition-transform hover:-translate-y-1"><img src={item.image} alt={displayDesignName(item)} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" /><p className="px-2 pb-1 pt-3 text-sm font-bold">{displayDesignName(item)}</p></button>)}</div></section>
      {related.length > 0 && <section className="mt-16 border-t border-border pt-12"><h2 className="text-3xl font-bold">More Products</h2><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    </div>
  </StoreLayout>;
}
