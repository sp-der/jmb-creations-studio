import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, PackageCheck, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProduct, relatedProducts } from "@/data/catalog";

export const Route = createFileRoute("/product/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({ design: typeof search.design === "string" ? search.design : undefined }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { design } = Route.useSearch();
  const product = getProduct(slug);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!product || !design) return;
    const index = product.designs.findIndex((item) => item.slug === design);
    if (index >= 0) setSelectedIndex(index);
  }, [product, design]);

  const related = useMemo(() => (product ? relatedProducts(product, 3) : []), [product]);
  if (!product) {
    return <StoreLayout><div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-3xl font-bold">Product not found</h1><Button variant="hero" className="mt-6" asChild><Link to="/shop">Back to Shop</Link></Button></div></StoreLayout>;
  }

  const designs = product.designs;
  const selected = designs[selectedIndex] ?? designs[0];
  const move = (direction: number) => {
    if (!designs.length) return;
    setSelectedIndex((current) => (current + direction + designs.length) % designs.length);
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <Button variant="soft" size="sm" asChild><Link to="/shop"><ArrowLeft aria-hidden /> Back to Products</Link></Button>
        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)]">
          <section>
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-lift">
              <img src={selected?.image ?? product.mainImage} alt={selected?.name ?? product.name} className="aspect-[4/5] w-full rounded-[1.5rem] object-cover" />
              {designs.length > 1 && <>
                <Button type="button" variant="soft" size="icon" className="absolute left-7 top-1/2 -translate-y-1/2" onClick={() => move(-1)} aria-label="Previous design"><ChevronLeft /></Button>
                <Button type="button" variant="soft" size="icon" className="absolute right-7 top-1/2 -translate-y-1/2" onClick={() => move(1)} aria-label="Next design"><ChevronRight /></Button>
              </>}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {designs.map((item, index) => (
                <button key={item.id} type="button" onClick={() => setSelectedIndex(index)} className={`overflow-hidden rounded-xl border p-1 ${selectedIndex === index ? "border-primary ring-2 ring-primary/15" : "border-border"}`}>
                  <img src={item.image} alt={item.name} className="aspect-[4/5] w-full rounded-lg object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <Badge className="rounded-full bg-gradient-plum text-primary-foreground">{product.category}</Badge>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{product.name}</h1>
            {selected && <p className="mt-3 text-lg font-bold text-primary">Selected: {selected.name}</p>}
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{product.description}</p>
            <ul className="mt-5 space-y-2">
              {product.details.map((detail) => <li key={detail} className="flex gap-3 text-sm"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Check className="size-3" /></span>{detail}</li>)}
            </ul>

            <div className="mt-7 rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <h2 className="text-lg font-bold">Choose your design</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select one of the available designs above. Pricing and order options will be connected to the live catalog database next.</p>
              <Button variant="hero" className="mt-5 w-full" asChild>
                <Link to="/custom-orders"><Sparkles aria-hidden /> Request This Design / Custom Version</Link>
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/35 p-4 text-center"><Truck className="mx-auto size-5 text-primary" /><p className="mt-2 text-xs font-bold">Shipping available</p></div>
              <div className="rounded-2xl bg-secondary/35 p-4 text-center"><PackageCheck className="mx-auto size-5 text-primary" /><p className="mt-2 text-xs font-bold">Local pickup</p></div>
            </div>
            {product.safety && <div className="mt-5 rounded-2xl border border-border p-5 text-sm"><strong>Safety:</strong> <span className="text-muted-foreground">{product.safety}</span></div>}
          </section>
        </div>

        <section className="mt-16 border-t border-border pt-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Available collection</p>
          <h2 className="mt-2 text-3xl font-bold">All {product.name} Designs</h2>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {designs.map((item, index) => (
              <button key={item.id} type="button" onClick={() => { setSelectedIndex(index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-[1.5rem] border border-border bg-card p-3 text-left shadow-soft transition-transform hover:-translate-y-1">
                <img src={item.image} alt={item.name} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" />
                <p className="px-2 pb-1 pt-3 text-sm font-bold">{item.name}</p>
              </button>
            ))}
          </div>
        </section>

        {related.length > 0 && <section className="mt-16 border-t border-border pt-12"><h2 className="text-3xl font-bold">More Products</h2><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
      </div>
    </StoreLayout>
  );
}
