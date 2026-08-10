import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { useStorefrontCatalog } from "@/lib/catalog-families";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories | JMB 2 Creations" }, { name: "description", content: "Browse every JMB 2 Creations design by category." }] }),
  component: Categories,
});

function Categories() {
  const { products, designCounts } = useStorefrontCatalog();
  return <StoreLayout>
    <PageHeader eyebrow="Categories" title="Browse every available design" subtitle="Open a category to see each design that is currently in the catalog." />
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
      {products.map((product) => {
        const count = designCounts[product.slug] ?? product.designs.length;
        return <article key={product.slug} className="card-lift flex flex-col rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <Link to="/category/$slug" params={{ slug: product.categorySlug }} className="overflow-hidden rounded-[1.5rem] bg-secondary/30"><img src={product.mainImage} alt={product.name} className="aspect-[4/5] w-full object-cover" loading="lazy" /></Link>
          <div className="flex flex-1 flex-col p-2 pt-4"><h2 className="text-xl font-bold">{product.name}</h2><p className="mt-2 text-sm text-muted-foreground">{product.description}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-mauve">{count} {count === 1 ? "design" : "designs"}</p><Button variant="soft" className="mt-4 w-full" asChild><Link to="/category/$slug" params={{ slug: product.categorySlug }}>View {product.name} <ArrowRight aria-hidden /></Link></Button></div>
        </article>;
      })}
    </div>
  </StoreLayout>;
}
