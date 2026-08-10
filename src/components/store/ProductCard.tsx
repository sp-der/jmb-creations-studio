import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/catalog";

export function ProductCard({ product, designCount }: { product: Product; index?: number; designCount?: number }) {
  const count = designCount ?? product.designs.length;
  return (
    <article className="card-lift group flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block p-3" aria-label={product.name}>
        <div className="overflow-hidden rounded-[1.5rem] bg-secondary/25">
          <img src={product.mainImage} alt={product.name} className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
        </div>
        <div className="absolute left-5 top-5 flex flex-col gap-1.5">
          {product.customizable && <Badge className="rounded-full bg-card px-3 text-foreground shadow-soft"><Sparkles className="mr-1 size-3" aria-hidden /> Customizable</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-mauve">{count} {count === 1 ? "design" : "designs"} available</p>
        <h3 className="mt-1 text-lg font-bold leading-snug"><Link to="/product/$slug" params={{ slug: product.slug }} className="hover:text-primary">{product.name}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <Button variant="hero" className="mt-5 w-full" asChild><Link to="/product/$slug" params={{ slug: product.slug }}>View Collection <ArrowRight aria-hidden /></Link></Button>
      </div>
    </article>
  );
}
