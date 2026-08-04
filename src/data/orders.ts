export const ORDER_STATUSES = [
  "Order Received",
  "Payment Confirmed",
  "In Production",
  "Ready for Pickup",
  "Shipped",
  "Completed",
  "Cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = {
  name: string;
  quantity: number;
  price: number;
  color?: string;
  option?: string;
  personalization?: string;
};

export type Order = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  date: string;
  total: number;
  fulfillment: "Shipping" | "Local Pickup";
  payment: "Paid" | "Pending" | "Refunded";
  status: OrderStatus;
  pickupDate?: string;
  pickupWindow?: string;
  tracking?: string;
  address?: string;
  items: OrderLine[];
  customerNote?: string;
  adminNote?: string;
  referenceImages: number;
  history: { status: string; at: string; by: string }[];
};

export const ORDERS: Order[] = [
  {
    id: "JMB-1042",
    customer: "Demo Customer — Avery R.",
    email: "avery.demo@example.com",
    phone: "(555) 010-2233",
    date: "2026-08-03",
    total: 46.5,
    fulfillment: "Local Pickup",
    payment: "Paid",
    status: "In Production",
    pickupDate: "2026-08-08",
    pickupWindow: "1:00 PM – 3:00 PM",
    items: [
      {
        name: "Custom Character-Inspired Bag Charm",
        quantity: 2,
        price: 12,
        color: "Lavender",
        option: "Lobster clip",
        personalization: "Avery",
      },
      { name: "Personalized Straw Topper", quantity: 2, price: 8, color: "Blush Pink", option: "Heart" },
    ],
    customerNote: "Demo note: pastel colors please!",
    adminNote: "Demo internal note: charm #2 reprinting, first layer lifted.",
    referenceImages: 2,
    history: [
      { status: "Order Received", at: "2026-08-03 09:12", by: "System" },
      { status: "Payment Confirmed", at: "2026-08-03 09:13", by: "System" },
      { status: "In Production", at: "2026-08-04 08:40", by: "Admin" },
    ],
  },
  {
    id: "JMB-1041",
    customer: "Demo Customer — Jordan M.",
    email: "jordan.demo@example.com",
    phone: "(555) 010-8877",
    date: "2026-08-02",
    total: 65,
    fulfillment: "Shipping",
    payment: "Paid",
    status: "Shipped",
    tracking: "DEMO9405511899560000001",
    address: "742 Sample Ave, Demo City, ST 00000",
    items: [
      {
        name: "Fantasy Cosplay Prop Sword",
        quantity: 1,
        price: 65,
        color: "Silver & Lavender",
        option: "Painted",
      },
    ],
    adminNote: "Demo internal note: double-boxed for shipping.",
    referenceImages: 1,
    history: [
      { status: "Order Received", at: "2026-07-24 14:02", by: "System" },
      { status: "Payment Confirmed", at: "2026-07-24 14:03", by: "System" },
      { status: "In Production", at: "2026-07-26 10:15", by: "Admin" },
      { status: "Shipped", at: "2026-08-02 16:20", by: "Admin" },
    ],
  },
  {
    id: "JMB-1040",
    customer: "Demo Customer — Sam P.",
    email: "sam.demo@example.com",
    phone: "(555) 010-4412",
    date: "2026-08-01",
    total: 21,
    fulfillment: "Local Pickup",
    payment: "Paid",
    status: "Ready for Pickup",
    pickupDate: "2026-08-06",
    pickupWindow: "10:00 AM – 12:00 PM",
    items: [
      { name: "Personalized Name Keychain", quantity: 3, price: 7, color: "Team Blue", personalization: "SAM / LEO / KAI" },
    ],
    referenceImages: 0,
    history: [
      { status: "Order Received", at: "2026-08-01 18:44", by: "System" },
      { status: "Payment Confirmed", at: "2026-08-01 18:45", by: "System" },
      { status: "In Production", at: "2026-08-02 09:00", by: "Admin" },
      { status: "Ready for Pickup", at: "2026-08-04 11:30", by: "Admin" },
    ],
  },
  {
    id: "JMB-1039",
    customer: "Demo Customer — Riley T.",
    email: "riley.demo@example.com",
    phone: "(555) 010-9090",
    date: "2026-07-30",
    total: 58,
    fulfillment: "Shipping",
    payment: "Pending",
    status: "Order Received",
    address: "9 Placeholder Rd, Demo City, ST 00000",
    items: [
      { name: "Mini Figure Display Shelf", quantity: 2, price: 28, color: "Pearl White", option: "Medium (12in)" },
    ],
    customerNote: "Demo note: gift wrap if possible.",
    referenceImages: 0,
    history: [{ status: "Order Received", at: "2026-07-30 20:11", by: "System" }],
  },
  {
    id: "JMB-1038",
    customer: "Demo Customer — Casey L.",
    email: "casey.demo@example.com",
    phone: "(555) 010-3131",
    date: "2026-07-28",
    total: 30,
    fulfillment: "Shipping",
    payment: "Paid",
    status: "Completed",
    tracking: "DEMO9405511899560000002",
    address: "88 Mock Lane, Demo City, ST 00000",
    items: [{ name: "Flexi Charm Sampler Pack", quantity: 1, price: 30, color: "Blush Pink" }],
    referenceImages: 0,
    history: [
      { status: "Order Received", at: "2026-07-28 12:01", by: "System" },
      { status: "Payment Confirmed", at: "2026-07-28 12:02", by: "System" },
      { status: "Shipped", at: "2026-07-30 15:00", by: "Admin" },
      { status: "Completed", at: "2026-08-01 09:00", by: "System" },
    ],
  },
  {
    id: "JMB-1037",
    customer: "Demo Customer — Morgan K.",
    email: "morgan.demo@example.com",
    phone: "(555) 010-7744",
    date: "2026-07-26",
    total: 15,
    fulfillment: "Local Pickup",
    payment: "Refunded",
    status: "Cancelled",
    items: [{ name: "Custom Sports Can Koozie", quantity: 1, price: 15, color: "Team Red" }],
    adminNote: "Demo internal note: customer changed their mind, refunded in full.",
    referenceImages: 0,
    history: [
      { status: "Order Received", at: "2026-07-26 10:22", by: "System" },
      { status: "Cancelled", at: "2026-07-27 08:10", by: "Admin" },
    ],
  },
];

export type CustomRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactMethod: string;
  productType: string;
  idea: string;
  theme: string;
  colors: string;
  size: string;
  quantity: number;
  budget: string;
  dateNeeded: string;
  fulfillment: string;
  referenceImages: number;
  status: "New" | "In Review" | "Quoted" | "Accepted" | "Declined" | "Converted";
  quote?: number;
  adminNote?: string;
  submitted: string;
};

export const CUSTOM_REQUESTS: CustomRequest[] = [
  {
    id: "REQ-208",
    name: "Demo Requester — Priya S.",
    email: "priya.demo@example.com",
    phone: "(555) 020-1188",
    contactMethod: "Email",
    productType: "Bag Charms",
    idea: "Demo request: a set of 12 charms as party favors, each with a different name.",
    theme: "Pastel space",
    colors: "Lavender, blush pink, pearl white",
    size: "About 2 inches",
    quantity: 12,
    budget: "$100 – $250",
    dateNeeded: "2026-08-29",
    fulfillment: "Local Pickup",
    referenceImages: 3,
    status: "New",
    submitted: "2026-08-04",
  },
  {
    id: "REQ-207",
    name: "Demo Requester — Elias W.",
    email: "elias.demo@example.com",
    phone: "(555) 020-6622",
    contactMethod: "Text message",
    productType: "Cosplay Props",
    idea: "Demo request: decorative prop staff for a convention costume, roughly shoulder height.",
    theme: "Fantasy mage",
    colors: "Antique gold and obsidian",
    size: "Approx. 5 ft",
    quantity: 1,
    budget: "$250 – $500",
    dateNeeded: "2026-09-19",
    fulfillment: "Shipping",
    referenceImages: 4,
    status: "Quoted",
    quote: 320,
    adminNote: "Demo internal note: quoted with 3-week lead time.",
    submitted: "2026-08-01",
  },
  {
    id: "REQ-206",
    name: "Demo Requester — Toni B.",
    email: "toni.demo@example.com",
    phone: "(555) 020-3311",
    contactMethod: "Facebook message",
    productType: "Personalized Gifts",
    idea: "Demo request: anniversary plaque with two names and a date.",
    theme: "Minimal script",
    colors: "Mauve and white",
    size: "6x8 in",
    quantity: 1,
    budget: "$50 – $100",
    dateNeeded: "2026-08-16",
    fulfillment: "Local Pickup",
    referenceImages: 1,
    status: "Accepted",
    quote: 42,
    submitted: "2026-07-27",
  },
  {
    id: "REQ-205",
    name: "Demo Requester — Hana D.",
    email: "hana.demo@example.com",
    phone: "(555) 020-9955",
    contactMethod: "Email",
    productType: "Sports Creations",
    idea: "Demo request: 24 koozies in team colors with jersey numbers.",
    theme: "Little league",
    colors: "Team red and white",
    size: "Standard 12oz",
    quantity: 24,
    budget: "$250 – $500",
    dateNeeded: "2026-08-22",
    fulfillment: "Local Pickup",
    referenceImages: 2,
    status: "In Review",
    submitted: "2026-07-25",
  },
];

export const CUSTOMERS = [
  { name: "Demo Customer — Avery R.", email: "avery.demo@example.com", orders: 6, spent: 214, since: "2025-11-02", type: "Pickup regular" },
  { name: "Demo Customer — Jordan M.", email: "jordan.demo@example.com", orders: 3, spent: 188, since: "2026-01-19", type: "Cosplay" },
  { name: "Demo Customer — Sam P.", email: "sam.demo@example.com", orders: 9, spent: 302, since: "2025-08-14", type: "Gifts" },
  { name: "Demo Customer — Riley T.", email: "riley.demo@example.com", orders: 2, spent: 96, since: "2026-04-03", type: "Collector" },
  { name: "Demo Customer — Casey L.", email: "casey.demo@example.com", orders: 4, spent: 141, since: "2026-02-27", type: "Market" },
];

export const SALES_CHART = [
  { month: "Feb", sales: 620 },
  { month: "Mar", sales: 810 },
  { month: "Apr", sales: 740 },
  { month: "May", sales: 1180 },
  { month: "Jun", sales: 1320 },
  { month: "Jul", sales: 1690 },
  { month: "Aug", sales: 540 },
];

export const DISCOUNTS = [
  { code: "WELCOME10", type: "10% off", uses: 42, limit: 200, status: "Active", expires: "2026-12-31" },
  { code: "MAKER15", type: "15% off orders $50+", uses: 11, limit: 100, status: "Active", expires: "2026-09-30" },
  { code: "MARKETDAY", type: "Free local pickup handling", uses: 87, limit: 0, status: "Paused", expires: "—" },
];

export const ADMIN_REVIEWS = [
  { product: "Personalized Name Keychain", author: "Demo Reviewer A", rating: 5, status: "Published", text: "Placeholder review text.", date: "2026-08-02" },
  { product: "Mini Figure Display Shelf", author: "Demo Reviewer B", rating: 4, status: "Pending", text: "Placeholder review text.", date: "2026-07-31" },
  { product: "Fantasy Cosplay Prop Sword", author: "Demo Reviewer C", rating: 5, status: "Published", text: "Placeholder review text.", date: "2026-07-20" },
];