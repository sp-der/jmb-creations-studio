import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { getCategoryProduct } from "@/data/catalog";
import { fetchLiveCatalogItems, type LiveCatalogItem } from "@/lib/live-catalog";
import { useDesignLabels } from "@/lib/use-design-labels";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const product = getCategoryProduct(slug);
  const designLabels = useDesignLabels(product?.slug);
  const [liveItems, setLiveItems] = useState<LiveCatalogItem[]>([]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    fetchLiveCatalogItems(product.slug)
      .then((items) => { if (!cancelled) setLiveItems(items); })
      .catch(() => { if (!cancelled) setLiveItems([]); });
    return () => { cancelled = true; };
  }, [product]);

  const liveGroups = useMemo(() => {
    const groups = new Map<string, LiveCatalogItem[]>();
    for (const item of liveItems) groups.set(item.name, [...(groups.get(item.name) ?? []), item]);
    return [...groups.entries()].map(([name, variants]) => ({
      name,
      image: variants[0]?.image_url ?? "",
      variants,
    }));
  }, [liveItems]);
  if (!product) {
    return <StoreLayout><div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-3xl font-bold">Category not found</h1><Button className="mt-6" variant="hero" asChild><Link to="/categories">Back to Categories</Link></Button></div></StoreLayout>;
  }

  const staticImages = new Set(product.designs.map((item) => item.image));
  const extraLiveGroups = liveGroups.filter((group) => group.image && !staticImages.has(group.image));
  const totalDesigns = product.designs.length + extraLiveGroups.length;

  return (
    <StoreLayout>
      <PageHeader eyebrow="Category" title={product.category} subtitle={`${totalDesigns} designs currently available.`} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Button variant="soft" size="sm" asChild><Link to="/categories"><ArrowLeft aria-hidden /> Categories</Link></Button>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {product.designs.map((design) => (
            <article key={design.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-card p-3 shadow-soft">
              <img src={design.image} alt={designLabels[design.id] ?? design.name} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" />
              <div className="px-2 pb-2 pt-3">
                <h2 className="text-sm font-bold sm:text-base">{designLabels[design.id] ?? design.name}</h2>
                <Button variant="soft" size="sm" className="mt-3 w-full" asChild>
                  <Link to="/product/$slug" params={{ slug: product.slug }} search={{ design: design.slug }}>
                    <Sparkles aria-hidden /> View Design
                  </Link>
                </Button>
              </div>
            </article>
          ))}
          {extraLiveGroups.map((group) => (
            <article key={`live-${group.name}`} className="overflow-hidden rounded-[1.5rem] border border-border bg-card p-3 shadow-soft">
              <img src={group.image} alt={group.name} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" />
              <div className="px-2 pb-2 pt-3">
                <h2 className="text-sm font-bold sm:text-base">{group.name}</h2>
                <Button variant="soft" size="sm" className="mt-3 w-full" asChild>
                  <Link to="/product/$slug" params={{ slug: product.slug }} search={{ live: group.name }}>
                    <Sparkles aria-hidden /> View Design
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
