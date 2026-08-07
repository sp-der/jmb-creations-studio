#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(packageDir, "files");

const required = [
  "src/routes/index.tsx",
  "src/routes/product.$slug.tsx",
  "src/routes/admin.tsx",
  "src/data/catalog.ts",
  "src/data/catalog-assets.ts",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing ${file}. Run this from the JMB repo root after Operational Phase 1.`);
    process.exit(1);
  }
}

const backupDir = path.join(root, ".jmb-phase2-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const file of required) {
  const source = path.join(root, file);
  const backup = path.join(backupDir, file.replaceAll("/", "__"));
  if (!fs.existsSync(backup)) fs.copyFileSync(source, backup);
}

const copies = [
  "src/routes/index.tsx",
  "src/routes/product.$slug.tsx",
  "src/lib/live-catalog.ts",
  "src/components/admin/CatalogManager.tsx",
  "supabase/jmb-catalog-phase2.sql",
  "public/logo.png",
];
for (const file of copies) {
  const source = path.join(filesDir, file);
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Updated ${file}`);
}

const adminPath = path.join(root, "src/routes/admin.tsx");
let admin = fs.readFileSync(adminPath, "utf8");

function replaceOnce(find, replacement, label) {
  if (!admin.includes(find)) {
    console.error(`Could not find expected admin section: ${label}`);
    process.exit(1);
  }
  admin = admin.replace(find, replacement);
}

replaceOnce(
  'import { ChatRoom } from "@/components/presentation/ChatRoom";',
  'import { CatalogManager } from "@/components/admin/CatalogManager";\nimport { ChatRoom } from "@/components/presentation/ChatRoom";',
  "CatalogManager import",
);
replaceOnce(
  'type AdminSection = "overview" | "orders" | "requests";',
  'type AdminSection = "overview" | "catalog" | "orders" | "requests";',
  "AdminSection type",
);
replaceOnce(
  '  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },\n  { id: "orders" as const, label: "Orders", icon: ShoppingBag },',
  '  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },\n  { id: "catalog" as const, label: "Catalog", icon: Box },\n  { id: "orders" as const, label: "Orders", icon: ShoppingBag },',
  "Catalog nav item",
);

admin = admin.replace('{ title: "Admin Dashboard Demo | JMB 2 Creations" }', '{ title: "Admin Dashboard | JMB 2 Creations" }');
admin = admin.replace('content:\n          "Presentation-only admin dashboard for JMB 2 Creations orders, pickup fulfillment and custom-order messages."', 'content:\n          "JMB 2 Creations admin dashboard for catalog, orders, pickup fulfillment and custom-order messages."');
admin = admin.replace('Presentation mode • no login required', 'Manage catalog, orders and custom chats');
admin = admin.replace('Demo shortcuts', 'Quick links');
admin = admin.replace('Checkout demo', 'Cart');
admin = admin.replace('Here is the presentation snapshot of orders, pickups and custom conversations.', 'Manage the live catalog, orders, pickups and custom conversations from one workspace.');
admin = admin.replace('Live mockup', 'JMB workspace');
admin = admin.replace('Shipping, pickup and custom-order examples', 'Shipping, pickup and custom orders');
admin = admin.replace('Demo quote sent', 'Quote sent');
admin = admin.replace('Demo Admin', 'JMB Admin');

// Remove the visible Reset Demo button from the header while keeping legacy demo helpers untouched for now.
admin = admin.replace(/\s*<Button variant="soft" size="sm" onClick=\{resetDemo\} className="hidden sm:inline-flex">\s*<RefreshCcw aria-hidden \/> Reset Demo\s*<\/Button>/m, "");

// Replace demo-sales metric with a truthful order count.
admin = admin.replace(
  /\{\s*label: "Demo sales",\s*value: "\$2,540",\s*detail: "Presentation total",\s*icon: DollarSign,\s*\},/m,
  '{\n      label: "Orders tracked",\n      value: orders.length,\n      detail: "Current workspace",\n      icon: ClipboardList,\n    },',
);

const ordersMarker = '          {section === "orders" && (';
replaceOnce(ordersMarker, '          {section === "catalog" && <CatalogManager />}\n\n' + ordersMarker, "Catalog render section");

fs.writeFileSync(adminPath, admin);
console.log("Updated src/routes/admin.tsx");

const envExample = path.join(root, ".env.example");
const envBlock = '\n# JMB live catalog\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n';
if (!fs.existsSync(envExample)) fs.writeFileSync(envExample, envBlock.trimStart());
else {
  const current = fs.readFileSync(envExample, "utf8");
  if (!current.includes("VITE_SUPABASE_URL")) fs.appendFileSync(envExample, envBlock);
}
console.log("Updated .env.example");

console.log("\nOperational Phase 2 applied.");
console.log("1) npm run build");
console.log("2) Configure Supabase using supabase/jmb-catalog-phase2.sql");
console.log("3) Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
console.log("4) Open /admin → Catalog");
