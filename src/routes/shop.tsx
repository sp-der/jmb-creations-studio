import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/store/ProductCard";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { CATEGORIES, PRODUCTS } from "@/data/catalog";

type Search = { category?: string; q?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    category: typeof search.category === "string" ? search.category : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Creations | JMB 2 Creations" },
      {
        name: "description",
        content:
          "Browse every JMB 2 Creations item: bag charms, straw toppers, keychains, display shelves, cosplay props, sports gifts and seasonal drops.",
      },
      { property: "og:title", content: "Shop All Creations | JMB 2 Creations" },
      {
        property: "og:description",
        content: "Filter by category, price, customization and availability.",
      },
    ],
  }),
  component: Shop,
});

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popular", label: "Most popular" },
  { value: "name", label: "Name A–Z" },
];

const PAGE_SIZE = 8;

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });

  const [query, setQuery] = useState(search.q ?? "");
  const [categories, setCategories] = useState<string[]>(
    search.category ? [search.category] : [],
  );
  const [maxPrice, setMaxPrice] = useState(70);
  const [customOnly, setCustomOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const toggleCategory = (slug: string) => {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );
    setVisible(PAGE_SIZE);
  };

  const results = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (query && !`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (categories.length && !categories.includes(p.categorySlug)) return false;
      if (p.price > maxPrice) return false;
      if (customOnly && !p.customizable) return false;
      if (inStockOnly && !p.inStock) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "popular":
          return b.popularity - a.popularity;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return list;
  }, [query, categories, maxPrice, customOnly, inStockOnly, sort]);

  const clearAll = () => {
    setQuery("");
    setCategories([]);
    setMaxPrice(70);
    setCustomOnly(false);
    setInStockOnly(false);
    void navigate({ search: {} });
  };

  const filters = (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-wide">Categories</legend>
        <div className="mt-3 space-y-2.5">
          {CATEGORIES.map((c) => (
            <div key={c.slug} className="flex items-center gap-3">
              <Checkbox
                id={`cat-${c.slug}`}
                checked={categories.includes(c.slug)}
                onCheckedChange={() => toggleCategory(c.slug)}
              />
              <Label htmlFor={`cat-${c.slug}`} className="text-sm font-medium">
                {c.name}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-wide">Max price</legend>
        <div className="mt-4">
          <Slider
            value={[maxPrice]}
            min={5}
            max={70}
            step={1}
            onValueChange={(v) => setMaxPrice(v[0] ?? 70)}
            aria-label="Maximum price"
          />
          <p className="mt-2 text-sm text-muted-foreground">Up to ${maxPrice}</p>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold uppercase tracking-wide">Options</legend>
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <Checkbox
              id="f-custom"
              checked={customOnly}
              onCheckedChange={(v) => setCustomOnly(Boolean(v))}
            />
            <Label htmlFor="f-custom" className="text-sm font-medium">
              Customizable only
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="f-stock"
              checked={inStockOnly}
              onCheckedChange={(v) => setInStockOnly(Boolean(v))}
            />
            <Label htmlFor="f-stock" className="text-sm font-medium">
              In stock &amp; ready to make
            </Label>
          </div>
        </div>
      </fieldset>

      <Button variant="soft" className="w-full" onClick={clearAll}>
        <X aria-hidden /> Clear all filters
      </Button>
    </div>
  );

  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Shop"
        title="All Creations"
        subtitle="Everything we print, in one colorful place. Filter by category, price or customization."
      />

      <div className="mx-auto max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:flex">
        <aside className="hidden w-64 shrink-0 lg:block">
          <h2 className="mb-4 text-lg font-bold">Filters</h2>
          {filters}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="shop-search" className="sr-only">
                Search creations
              </label>
              <Input
                id="shop-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Search creations…"
                className="h-11 rounded-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="soft" className="lg:hidden">
                    <SlidersHorizontal aria-hidden /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto bg-background">
                  <SheetTitle className="font-display text-xl">Filters</SheetTitle>
                  <div className="mt-6">{filters}</div>
                </SheetContent>
              </Sheet>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-11 w-[190px] rounded-full" aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground" role="status">
            Showing {Math.min(visible, results.length)} of {results.length} creations
          </p>

          {results.length === 0 ? (
            <div className="mt-10 rounded-[1.75rem] border border-dashed border-border bg-card p-12 text-center shadow-soft">
              <h2 className="text-xl font-bold">No creations match those filters</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try widening your price range or clearing a category — or ask us for a custom piece.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="soft" onClick={clearAll}>
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.slice(0, visible).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
              {visible < results.length && (
                <div className="mt-10 text-center">
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Load more creations
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
