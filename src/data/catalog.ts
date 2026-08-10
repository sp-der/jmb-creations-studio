import { CATALOG_ASSETS } from "@/data/catalog-assets";

export type ProductDesign = {
  id: string;
  slug: string;
  name: string;
  image: string;
  sourceFile: string;
  active: boolean;
};

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  count: number;
  tone: "pastel" | "lavender" | "mauve" | "periwinkle";
  image: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  compareAt?: number;
  description: string;
  details: string[];
  colors: string[];
  options?: { label: string; values: string[] };
  customizable: boolean;
  badge?: "New" | "Popular" | "Seasonal";
  inStock: boolean;
  stock: number;
  featured: boolean;
  popularity: number;
  createdAt: string;
  processingDays: string;
  care?: string;
  safety?: string;
  mainImage: string;
  galleryImages: string[];
  designs: ProductDesign[];
};

const family = (slug: string) => CATALOG_ASSETS[slug];
const designsFor = (slug: string): ProductDesign[] =>
  (family(slug)?.designs ?? []).map((design, index) => ({
    id: `${slug}-${index + 1}`,
    slug: design.slug,
    name: design.name,
    image: design.image,
    sourceFile: design.sourceFile,
    active: true,
  }));

export const PRODUCTS: Product[] = [
  {
    id: "family-soap-dispensers",
    slug: "soap-dispensers",
    name: "Soap Dispensers",
    category: "Soap Dispensers",
    categorySlug: "soap-dispensers",
    price: 0,
    description: family("soap-dispensers")?.description ?? "Custom soap dispenser designs.",
    details: ["Choose from the currently available designs", "Made to order", "Additional custom designs can be requested"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 100,
    createdAt: "2026-08-06",
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: family("soap-dispensers")?.mainImage ?? "",
    galleryImages: designsFor("soap-dispensers").map((d) => d.image),
    designs: designsFor("soap-dispensers"),
  },
  {
    id: "family-tap-wands",
    slug: "tap-wands",
    name: "Tap Wands",
    category: "Tap Wands",
    categorySlug: "tap-wands",
    price: 0,
    description: family("tap-wands")?.description ?? "Custom tap wand designs.",
    details: ["Choose from the currently available designs", "Lightweight 3D-printed construction", "Custom requests available"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 90,
    createdAt: "2026-08-06",
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: family("tap-wands")?.mainImage ?? "",
    galleryImages: designsFor("tap-wands").map((d) => d.image),
    designs: designsFor("tap-wands"),
  },
  {
    id: "family-cup-koozies",
    slug: "cup-koozies",
    name: "Cup Koozies",
    category: "Cup Koozies",
    categorySlug: "cup-koozies",
    price: 0,
    description: family("cup-koozies")?.description ?? "Sports and themed cup koozies.",
    details: ["Multiple team and color designs", "Made to order", "Ask about custom teams or themes"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 95,
    createdAt: "2026-08-06",
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: family("cup-koozies")?.mainImage ?? "",
    galleryImages: designsFor("cup-koozies").map((d) => d.image),
    designs: designsFor("cup-koozies"),
  },
  {
    id: "family-shelves",
    slug: "display-shelves",
    name: "Display Shelves",
    category: "Display Shelves",
    categorySlug: "display-shelves",
    price: 0,
    description: family("shelves")?.description ?? "Custom display shelves.",
    details: ["Designed for figures and collectibles", "Multiple themed designs", "Custom requests available"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 88,
    createdAt: "2026-08-06",
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: family("shelves")?.mainImage ?? "",
    galleryImages: designsFor("shelves").map((d) => d.image),
    designs: designsFor("shelves"),
  },
  {
    id: "family-cosplay",
    slug: "cosplay-props",
    name: "Cosplay Props",
    category: "Cosplay Props",
    categorySlug: "cosplay-props",
    price: 0,
    description: family("cosplay")?.description ?? "Decorative cosplay props.",
    details: ["Decorative and costume-use products", "Made to order", "Custom color requests available"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 85,
    createdAt: "2026-08-06",
    processingDays: "Processing time shown after design and order details are confirmed",
    safety: "Decorative costume and display products only. Not intended as functional weapons or for contact, sparring, or defense.",
    mainImage: family("cosplay")?.mainImage ?? "",
    galleryImages: designsFor("cosplay").map((d) => d.image),
    designs: designsFor("cosplay"),
  },
  {
    id: "family-glasses-holder",
    slug: "glasses-holder",
    name: "Glasses Holder",
    category: "Glasses Holder",
    categorySlug: "glasses-holder",
    price: 0,
    description: "Character-inspired glasses holders and display cases for keeping eyewear organized and easy to grab.",
    details: ["Choose from available character and color designs", "3D-printed display and storage", "Additional custom designs can be requested"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 82,
    createdAt: "2026-08-10",
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: "/catalog/glasses-holder/main.webp",
    galleryImages: [],
    designs: [],
  },
  {
    id: "family-heart-phone-stands",
    slug: "heart-phone-stands",
    name: "Heart Phone Stands",
    category: "Heart Phone Stands",
    categorySlug: "heart-phone-stands",
    price: 0,
    description: "Curved heart-shaped phone stands in colorful 3D-printed finishes for desks, counters and nightstands.",
    details: ["Available in multiple colors", "Designed to hold a phone upright for easy viewing", "Custom color requests available"],
    colors: [],
    customizable: true,
    inStock: true,
    stock: 0,
    featured: true,
    popularity: 80,
    createdAt: "2026-08-10",
    processingDays: "Processing time shown after design and order details are confirmed",
    mainImage: "/catalog/heart-phone-stands/main.webp",
    galleryImages: [],
    designs: [],
  },
];

const TONES: Category["tone"][] = ["pastel", "lavender", "mauve", "periwinkle", "lavender", "mauve", "pastel"];
export const CATEGORIES: Category[] = PRODUCTS.map((product, index) => ({
  slug: product.categorySlug,
  name: product.category,
  blurb: product.description,
  count: product.designs.length,
  tone: TONES[index] ?? "pastel",
  image: product.mainImage,
}));

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryProduct(slug: string) {
  return PRODUCTS.find((p) => p.categorySlug === slug);
}

export function relatedProducts(product: Product, limit = 4) {
  return PRODUCTS.filter((p) => p.id !== product.id).slice(0, limit);
}

export const FAQS = [
  { q: "How long does an order take?", a: "Processing time depends on the item, size, customization, and current order volume. The order details will show the confirmed timeline." },
  { q: "Do you offer local pickup?", a: "Yes. Customers can choose local pickup when it is available and will receive pickup instructions when the order is ready." },
  { q: "Can I request a design that is not listed?", a: "Yes. Use the custom-order page to send JMB 2 Creations your idea, preferred colors, size, quantity, and reference images." },
  { q: "Are cosplay props functional weapons?", a: "No. Cosplay props are decorative or costume-use products and are not intended for contact, sparring, or defense." },
];

export const REVIEWS: Array<{ name: string; location: string; rating: number; text: string }> = [];

export const SOCIAL = {
  instagram: "https://www.instagram.com/jmb2creations",
  facebook: "https://www.facebook.com/JMB2Creations?mibextid=ZbWKwL&utm_source=ig&utm_medium=social&utm_content=link_in_bio",
};

export const PICKUP_LOCATION = {
  name: "JMB 2 Creations local pickup",
  address: "Pickup details are provided after an order is confirmed.",
  note: "Please wait until your order is marked Ready for Pickup before arriving.",
  days: [] as string[],
  windows: [] as string[],
};
