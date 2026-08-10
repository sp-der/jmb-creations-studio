import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Input } from "@/components/ui/input";
import { useStorefrontCatalog } from "@/lib/catalog-families";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop Products | JMB 2 Creations" }, { name: "description", content: "Browse JMB 2 Creations product collections and available designs." }] }),
  component: Shop,
});

function Shop() {
  const [query, setQuery] = useState("");
  const { products, designCounts } = useStorefrontCatalog();
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(q));
  }, [query, products]);

  return <StoreLayout>
    <PageHeader eyebrow="Products" title="Shop JMB Creations" subtitle="Choose a product type, then open the collection to see every design currently available." />
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="relative mx-auto max-w-xl"><Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground" aria-hidden /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product collections…" className="h-11 rounded-full pl-11" /></div>
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.map((product) => <ProductCard key={product.id} product={product} designCount={designCounts[product.slug]} />)}</div>
    </div>
  </StoreLayout>;
}
