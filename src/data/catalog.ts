export type Category = {
  slug: string;
  name: string;
  blurb: string;
  count: number;
  tone: "pastel" | "lavender" | "mauve" | "periwinkle";
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
  images: number;
};

export const CATEGORIES: Category[] = [
  {
    slug: "bag-charms",
    name: "Bag Charms",
    blurb: "Clip-on charms with articulated details",
    count: 24,
    tone: "pastel",
  },
  {
    slug: "straw-toppers",
    name: "Straw Toppers",
    blurb: "Sip in style with a personalized topper",
    count: 18,
    tone: "lavender",
  },
  {
    slug: "keychains-trinkets",
    name: "Keychains & Trinkets",
    blurb: "Little everyday keepsakes",
    count: 31,
    tone: "mauve",
  },
  {
    slug: "display-shelves",
    name: "Display Shelves",
    blurb: "Mini figure shelves and stands",
    count: 12,
    tone: "periwinkle",
  },
  {
    slug: "cosplay-props",
    name: "Cosplay Props",
    blurb: "Decorative costume props and swords",
    count: 9,
    tone: "lavender",
  },
  {
    slug: "sports-creations",
    name: "Sports Creations",
    blurb: "Team colors, koozies and spirit gifts",
    count: 15,
    tone: "pastel",
  },
  {
    slug: "personalized-gifts",
    name: "Personalized Gifts",
    blurb: "Names, dates and one-of-a-kind ideas",
    count: 27,
    tone: "mauve",
  },
  {
    slug: "seasonal-items",
    name: "Seasonal Items",
    blurb: "Holiday drops and limited runs",
    count: 14,
    tone: "periwinkle",
  },
];

const PALETTE = ["Blush Pink", "Lavender", "Periwinkle", "Mauve", "Pearl White", "Glow in the Dark"];

export const PRODUCTS: Product[] = [
  {
    id: "p-001",
    slug: "custom-character-inspired-bag-charm",
    name: "Custom Character-Inspired Bag Charm",
    category: "Bag Charms",
    categorySlug: "bag-charms",
    price: 12,
    description:
      "A chunky articulated charm printed in your favorite color combo, finished with a sturdy lobster clip. Great on backpacks, purses and gym bags.",
    details: [
      "Approx. 2.5in tall with movable joints",
      "Printed in durable PLA+ filament",
      "Metal lobster clip and jump ring",
    ],
    colors: PALETTE,
    options: { label: "Clip style", values: ["Lobster clip", "Keyring", "Swivel clasp"] },
    customizable: true,
    badge: "Popular",
    inStock: true,
    stock: 18,
    featured: true,
    popularity: 98,
    createdAt: "2026-06-18",
    processingDays: "3–5 business days",
    care: "Wipe clean with a soft dry cloth. Keep out of hot cars — printed plastic can soften above 130°F.",
    images: 4,
  },
  {
    id: "p-002",
    slug: "personalized-straw-topper",
    name: "Personalized Straw Topper",
    category: "Straw Toppers",
    categorySlug: "straw-toppers",
    price: 8,
    description:
      "Never mix up your tumbler again. Choose a shape, add a name, and pick your two-color combo.",
    details: ["Fits 9–10mm reusable straws", "Name up to 12 characters", "Two-color print"],
    colors: PALETTE,
    options: { label: "Shape", values: ["Heart", "Star", "Flower", "Cloud"] },
    customizable: true,
    badge: "New",
    inStock: true,
    stock: 42,
    featured: true,
    popularity: 91,
    createdAt: "2026-07-22",
    processingDays: "2–4 business days",
    care: "Hand wash in cool water. Not dishwasher or microwave safe.",
    images: 3,
  },
  {
    id: "p-003",
    slug: "mini-figure-display-shelf",
    name: "Mini Figure Display Shelf",
    category: "Display Shelves",
    categorySlug: "display-shelves",
    price: 28,
    compareAt: 34,
    description:
      "A tiered wall shelf sized for mini figures and small collectibles. Stack several for a full collection wall.",
    details: ["Holds 6–9 mini figures", "Includes mounting hardware", "Matte finish"],
    colors: ["Pearl White", "Lavender", "Periwinkle", "Charcoal"],
    options: { label: "Size", values: ["Small (8in)", "Medium (12in)", "Large (16in)"] },
    customizable: true,
    inStock: true,
    stock: 7,
    featured: true,
    popularity: 74,
    createdAt: "2026-05-02",
    processingDays: "5–7 business days",
    care: "Dust with a dry brush. Max recommended load 2 lbs.",
    images: 4,
  },
  {
    id: "p-004",
    slug: "custom-sports-can-koozie",
    name: "Custom Sports Can Koozie",
    category: "Sports Creations",
    categorySlug: "sports-creations",
    price: 15,
    description:
      "Printed in your team colors with a name or number on the front. A go-to gift for tailgates and team parties.",
    details: ["Fits standard 12oz cans", "Flexible printed shell", "Add a name or number"],
    colors: ["Team Red", "Team Blue", "Team Green", "Pearl White", "Charcoal"],
    customizable: true,
    badge: "Popular",
    inStock: true,
    stock: 25,
    featured: true,
    popularity: 86,
    createdAt: "2026-06-30",
    processingDays: "3–5 business days",
    care: "Hand wash only. Do not freeze with liquid inside.",
    images: 3,
  },
  {
    id: "p-005",
    slug: "fantasy-cosplay-prop-sword",
    name: "Fantasy Cosplay Prop Sword",
    category: "Cosplay Props",
    categorySlug: "cosplay-props",
    price: 65,
    description:
      "A lightweight decorative prop sword for costumes, cosplay photos and display. Hand finished and painted in your chosen palette.",
    details: [
      "Approx. 34in overall length",
      "Hollow, lightweight print with reinforced core",
      "Blunt decorative edge and rounded tip",
    ],
    colors: ["Silver & Lavender", "Antique Gold", "Obsidian", "Custom palette"],
    options: { label: "Finish", values: ["Painted", "Raw print (paint yourself)"] },
    customizable: true,
    inStock: true,
    stock: 3,
    featured: true,
    popularity: 69,
    createdAt: "2026-04-14",
    processingDays: "10–14 business days",
    safety:
      "Decorative costume prop only. This is not a functional weapon: it has a blunt edge, is not sharpened, and is not intended for contact, sparring or defense. Adult supervision recommended. Please check event and venue prop policies before carrying.",
    images: 5,
  },
  {
    id: "p-006",
    slug: "personalized-name-keychain",
    name: "Personalized Name Keychain",
    category: "Keychains & Trinkets",
    categorySlug: "keychains-trinkets",
    price: 7,
    description:
      "A simple, sturdy name keychain in your color combo — perfect for backpacks, lunch bags and party favors.",
    details: ["Up to 14 characters", "Rounded, snag-free edges", "Bulk pricing available"],
    colors: PALETTE,
    customizable: true,
    badge: "Popular",
    inStock: true,
    stock: 60,
    featured: true,
    popularity: 95,
    createdAt: "2026-07-09",
    processingDays: "2–4 business days",
    images: 3,
  },
  {
    id: "p-007",
    slug: "seasonal-pumpkin-shelf-sitter",
    name: "Seasonal Shelf Sitter Set",
    category: "Seasonal Items",
    categorySlug: "seasonal-items",
    price: 22,
    description:
      "A set of three seasonal shelf sitters that rotate with our limited holiday drops. Sold as a matched trio.",
    details: ["Set of 3 pieces", "Limited seasonal run", "Gift-boxed on request"],
    colors: ["Autumn Mix", "Winter Mix", "Spring Mix", "Custom palette"],
    customizable: false,
    badge: "Seasonal",
    inStock: false,
    stock: 0,
    featured: false,
    popularity: 58,
    createdAt: "2026-03-11",
    processingDays: "4–6 business days",
    images: 3,
  },
  {
    id: "p-008",
    slug: "custom-photo-gift-plaque",
    name: "Personalized Gift Plaque",
    category: "Personalized Gifts",
    categorySlug: "personalized-gifts",
    price: 34,
    description:
      "A layered plaque with a name, date or short message. A favorite for birthdays, weddings and teacher gifts.",
    details: ["6in x 8in with stand", "Two-line message", "Choose accent color"],
    colors: PALETTE,
    options: { label: "Style", values: ["Standing", "Wall mount"] },
    customizable: true,
    inStock: true,
    stock: 11,
    featured: false,
    popularity: 72,
    createdAt: "2026-06-05",
    processingDays: "5–7 business days",
    images: 4,
  },
  {
    id: "p-009",
    slug: "articulated-mini-dragon",
    name: "Articulated Mini Collectible",
    category: "Keychains & Trinkets",
    categorySlug: "keychains-trinkets",
    price: 18,
    description:
      "A fully articulated fidget collectible printed in one piece. Every color combo prints a little differently, which is half the fun.",
    details: ["Approx. 6in long", "Prints fully assembled", "Satisfying fidget joints"],
    colors: PALETTE,
    customizable: true,
    badge: "New",
    inStock: true,
    stock: 20,
    featured: true,
    popularity: 88,
    createdAt: "2026-07-28",
    processingDays: "3–5 business days",
    safety: "Small parts may break if forced. Not recommended for children under 3.",
    images: 4,
  },
  {
    id: "p-010",
    slug: "team-spirit-bag-charm",
    name: "Team Spirit Bag Charm",
    category: "Sports Creations",
    categorySlug: "sports-creations",
    price: 11,
    description: "Show your colors with a sporty charm — add a jersey number or initials.",
    details: ["Approx. 2in", "Two-color print", "Add number or initials"],
    colors: ["Team Red", "Team Blue", "Team Green", "Team Purple"],
    customizable: true,
    inStock: true,
    stock: 30,
    featured: false,
    popularity: 66,
    createdAt: "2026-05-19",
    processingDays: "3–5 business days",
    images: 3,
  },
  {
    id: "p-011",
    slug: "cosplay-armor-accent-set",
    name: "Cosplay Armor Accent Set",
    category: "Cosplay Props",
    categorySlug: "cosplay-props",
    price: 48,
    description:
      "Decorative armor accents, buckles and emblems to finish a costume build. Raw or painted.",
    details: ["Set of 6 accents", "Strap slots included", "Sized to your measurements"],
    colors: ["Antique Gold", "Silver & Lavender", "Obsidian", "Custom palette"],
    options: { label: "Finish", values: ["Painted", "Raw print (paint yourself)"] },
    customizable: true,
    inStock: true,
    stock: 5,
    featured: false,
    popularity: 54,
    createdAt: "2026-04-27",
    processingDays: "10–14 business days",
    safety:
      "Decorative costume pieces only — not protective equipment and not intended to absorb impact.",
    images: 4,
  },
  {
    id: "p-012",
    slug: "custom-color-desk-organizer",
    name: "Custom-Color Desk Organizer",
    category: "Personalized Gifts",
    categorySlug: "personalized-gifts",
    price: 26,
    description:
      "Keep pens, tools and tiny treasures tidy. Choose your filament colors and add a name band.",
    details: ["4 compartments", "Non-slip feet", "Optional name band"],
    colors: PALETTE,
    customizable: true,
    inStock: true,
    stock: 9,
    featured: false,
    popularity: 61,
    createdAt: "2026-06-12",
    processingDays: "4–6 business days",
    images: 3,
  },
  {
    id: "p-013",
    slug: "glow-star-straw-topper",
    name: "Glow Star Straw Topper",
    category: "Straw Toppers",
    categorySlug: "straw-toppers",
    price: 9,
    description: "A glow-in-the-dark star topper that charges in daylight and shines at night.",
    details: ["Fits 9–10mm straws", "Glow filament", "Sold individually"],
    colors: ["Glow in the Dark", "Glow + Lavender", "Glow + Blush Pink"],
    customizable: false,
    inStock: true,
    stock: 16,
    featured: false,
    popularity: 70,
    createdAt: "2026-07-16",
    processingDays: "2–4 business days",
    care: "Hand wash in cool water.",
    images: 3,
  },
  {
    id: "p-014",
    slug: "collector-figure-stand-trio",
    name: "Collector Figure Stand Trio",
    category: "Display Shelves",
    categorySlug: "display-shelves",
    price: 19,
    description: "Three tiered stands that lift your favorites into view on a shelf or desk.",
    details: ["Set of 3 heights", "Stackable design", "Matte finish"],
    colors: ["Pearl White", "Charcoal", "Lavender"],
    customizable: false,
    inStock: true,
    stock: 13,
    featured: false,
    popularity: 63,
    createdAt: "2026-05-28",
    processingDays: "4–6 business days",
    images: 3,
  },
  {
    id: "p-015",
    slug: "holiday-ornament-set",
    name: "Holiday Ornament Set",
    category: "Seasonal Items",
    categorySlug: "seasonal-items",
    price: 24,
    description: "A set of four printed ornaments with optional family names on each.",
    details: ["Set of 4", "Ribbon included", "Add up to 4 names"],
    colors: PALETTE,
    customizable: true,
    badge: "Seasonal",
    inStock: true,
    stock: 8,
    featured: false,
    popularity: 57,
    createdAt: "2026-02-20",
    processingDays: "5–7 business days",
    images: 4,
  },
  {
    id: "p-016",
    slug: "flexi-charm-sampler",
    name: "Flexi Charm Sampler Pack",
    category: "Bag Charms",
    categorySlug: "bag-charms",
    price: 30,
    description: "Three surprise flexi charms in a coordinated palette — a great gift or party set.",
    details: ["3 charms per pack", "Coordinated colors", "Surprise designs"],
    colors: PALETTE,
    customizable: false,
    badge: "New",
    inStock: true,
    stock: 14,
    featured: false,
    popularity: 80,
    createdAt: "2026-07-31",
    processingDays: "3–5 business days",
    images: 3,
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function relatedProducts(product: Product, limit = 4) {
  const sameCategory = PRODUCTS.filter(
    (p) => p.categorySlug === product.categorySlug && p.id !== product.id,
  );
  const others = PRODUCTS.filter(
    (p) => p.categorySlug !== product.categorySlug && p.id !== product.id,
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export const REVIEWS = [
  {
    name: "Sample Reviewer A",
    location: "Local market customer",
    rating: 5,
    text: "Placeholder review text. The charm colors matched exactly what I asked for and it arrived faster than I expected.",
  },
  {
    name: "Sample Reviewer B",
    location: "Online order",
    rating: 5,
    text: "Placeholder review text. Ordered personalized keychains for my daughter's party and every kid loved them.",
  },
  {
    name: "Sample Reviewer C",
    location: "Local pickup",
    rating: 5,
    text: "Placeholder review text. The cosplay prop looked incredible in photos and pickup was easy and friendly.",
  },
];

export const FAQS = [
  {
    q: "How long does an order take?",
    a: "Most in-stock creations print and ship in 3–5 business days. Larger cosplay props and big custom builds take 10–14 business days. Every product page lists its own processing estimate.",
  },
  {
    q: "Do you offer local pickup?",
    a: "Yes. At checkout you can choose local pickup and select a date and time window. We'll email you when your order is marked Ready for Pickup, along with the exact meeting details.",
  },
  {
    q: "Can I pick my own colors?",
    a: "Almost always. Products marked Customizable let you choose colors, add names and pick options. If you want something outside the listed choices, send a custom request.",
  },
  {
    q: "Are the cosplay swords real weapons?",
    a: "No. All of our props are decorative costume pieces — lightweight, blunt, and made for photos, conventions and display only. They are not functional weapons.",
  },
  {
    q: "Can you print licensed characters?",
    a: "We create original and character-inspired designs, but we don't reproduce copyrighted or licensed artwork. Tell us the vibe you're after and we'll design something original.",
  },
  {
    q: "Do you take bulk or event orders?",
    a: "Yes — party favors, team gifts, teacher gifts and market wholesale are all welcome. Start a custom request with your quantity and date needed.",
  },
  {
    q: "How do I care for a printed item?",
    a: "Hand wash in cool water, keep items out of hot cars and away from direct heat. Printed plastic can soften above about 130°F.",
  },
  {
    q: "What if something arrives damaged?",
    a: "Message us within 7 days with a photo and we'll reprint or refund. We want you happy with your creation.",
  },
];

export const SOCIAL = {
  instagram: "https://www.instagram.com/jmb2creations",
  facebook:
    "https://www.facebook.com/JMB2Creations?mibextid=ZbWKwL&utm_source=ig&utm_medium=social&utm_content=link_in_bio",
};

export const PICKUP_LOCATION = {
  name: "JMB 2 Creations — Pickup Point (placeholder)",
  address: "1234 Sample Street, Your City, ST 00000",
  note: "Placeholder location. Final pickup address and instructions are included in your Ready for Pickup email.",
  days: ["Wednesday", "Friday", "Saturday"],
  windows: ["10:00 AM – 12:00 PM", "1:00 PM – 3:00 PM", "5:00 PM – 7:00 PM"],
};