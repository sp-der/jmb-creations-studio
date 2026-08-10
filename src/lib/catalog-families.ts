import { useEffect, useMemo, useState } from "react";
import { PRODUCTS, type Product } from "@/data/catalog";
import {
  fetchAllLiveCatalogItems,
  fetchCatalogFamilies,
  type LiveCatalogFamily,
  type LiveCatalogItem,
} from "@/lib/live-catalog";

const DEFAULT_DETAILS = [
  "Choose from the currently available designs",
  "Made by JMB 2 Creations",
  "Additional custom designs can be requested",
];

export function productFromFamily(family: LiveCatalogFamily): Product {
  const existing = PRODUCTS.find((product) => product.slug === family.slug || product.categorySlug === family.slug);
  if (existing) {
    return {
      ...existing,
      name: family.name || existing.name,
      category: family.name || existing.category,
      categorySlug: family.slug,
      description: family.description || existing.description,
      mainImage: family.image_url || existing.mainImage,
      customizable: family.customizable,
    };
  }

  return {
    id: family.id || `family-${family.slug}`,
    slug: family.slug,
    name: family.name,
    category: family.name,
    categorySlug: family.slug,
    price: 0,
    description: family.description || `${family.name} from JMB 2 Creations.`,
    details: DEFAULT_DETAILS,
    colors: [],
    customizable: family.customizable,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 50,
    createdAt: family.created_at || new Date().toISOString().slice(0, 10),
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: family.image_url || "/logo.png",
    galleryImages: [],
    designs: [],
  };
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

export function countAvailableDesigns(product: Product, liveItems: LiveCatalogItem[]) {
  const familyItems = liveItems.filter((item) => item.family_slug === product.slug && item.active !== false);
  const liveKeys = new Set<string>();
  for (const item of familyItems) {
    const option = product.slug === "heart-phone-stands" ? normalize(item.team) : "";
    liveKeys.add(`${normalize(item.name)}|${option || normalize(item.image_url)}`);
  }

  let count = liveKeys.size;
  for (const design of product.designs) {
    const designName = normalize(design.name);
    const matched = familyItems.some((item) =>
      item.image_url === design.image ||
      normalize(item.name) === designName ||
      normalize(item.team) === designName,
    );
    if (!matched) count += 1;
  }
  return count;
}

export function useStorefrontCatalog() {
  const [families, setFamilies] = useState<LiveCatalogFamily[]>([]);
  const [liveItems, setLiveItems] = useState<LiveCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCatalogFamilies(false).catch(() => [] as LiveCatalogFamily[]),
      fetchAllLiveCatalogItems(false).catch(() => [] as LiveCatalogItem[]),
    ]).then(([nextFamilies, nextItems]) => {
      if (cancelled) return;
      setFamilies(nextFamilies);
      setLiveItems(nextItems);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const products = useMemo(() => {
    if (!families.length) return PRODUCTS;
    const merged = families.filter((family) => family.active).map(productFromFamily);
    const seen = new Set(merged.map((product) => product.slug));
    for (const product of PRODUCTS) if (!seen.has(product.slug)) merged.push(product);
    return merged;
  }, [families]);

  const designCounts = useMemo(() => Object.fromEntries(
    products.map((product) => [product.slug, countAvailableDesigns(product, liveItems)]),
  ) as Record<string, number>, [products, liveItems]);

  return { products, families, liveItems, designCounts, loading };
}
