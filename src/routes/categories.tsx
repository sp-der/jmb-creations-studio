import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ProductPlaceholder } from "@/components/brand/ProductPlaceholder";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/catalog";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category | JMB 2 Creations" },
      {
        name: "description",
        content:
          "Explore JMB 2 Creations categories: bag charms, straw toppers, keychains, display shelves, cosplay props, sports creations, gifts and seasonal items.",
      },
      { property: "og:title", content: "Shop by Category | JMB 2 Creations" },
      {
        property: "og:description",
        content: "Find your next creation by category.",
      },
    ],
  }),
  component: Categories,
});

function Categories() {
  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Categories"
        title="Find your next creation"
        subtitle="Eight collections of handmade and 3D-printed pieces — most can be customized in your colors."
      />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {CATEGORIES.map((c, i) => (
          <article
            key={c.slug}
            className="card-lift flex flex-col rounded-[1.75rem] border border-border bg-card p-4 shadow-soft"
          >
            <ProductPlaceholder label={c.name} seed={i} className="aspect-[4/3] w-full" />
            <div className="flex flex-1 flex-col p-2 pt-4">
              <h2 className="text-xl font-bold">{c.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.blurb}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-mauve">
                {c.count} creations
              </p>
              <Button variant="soft" className="mt-4 w-full" asChild>
                <Link to="/shop" search={{ category: c.slug }}>
                  Shop {c.name} <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </StoreLayout>
  );
}