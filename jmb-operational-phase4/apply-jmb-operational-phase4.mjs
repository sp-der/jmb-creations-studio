#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(packageDir, "files");

const required = [
  "src/data/catalog.ts",
  "src/routes/admin.tsx",
  "src/routes/account.tsx",
  "src/routes/custom-orders.tsx",
  "src/routes/product.$slug.tsx",
  "src/components/admin/CatalogManager.tsx",
  "src/lib/live-catalog.ts",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing ${file}. Run this from the JMB repo root after Operational Phase 3.`);
    process.exit(1);
  }
}

const copies = [
  "src/components/admin/CatalogManager.tsx",
  "src/components/admin/DesignNameEditor.tsx",
  "src/components/admin/InvoiceMaker.tsx",
  "src/components/admin/OrderManager.tsx",
  "src/lib/cart.tsx",
  "src/lib/custom-requests.ts",
  "src/lib/customer-auth.ts",
  "src/lib/design-labels.ts",
  "src/lib/invoices.ts",
  "src/lib/live-catalog.ts",
  "src/lib/orders.ts",
  "src/lib/use-design-labels.ts",
  "src/routes/account.tsx",
  "src/routes/admin.tsx",
  "src/routes/cart.tsx",
  "src/routes/category.$slug.tsx",
  "src/routes/checkout.tsx",
  "src/routes/custom-orders.tsx",
  "src/routes/guest.custom.$requestId.tsx",
  "src/routes/guest.order.$orderId.tsx",
  "src/routes/orders.$orderId.tsx",
  "src/routes/product.$slug.tsx",
  "supabase/jmb-operational-phase4.sql",
  "supabase/functions/_shared/jmb.ts",
  "supabase/functions/jmb-shipping-rates/index.ts",
  "supabase/functions/jmb-create-order/index.ts",
  "supabase/functions/jmb-buy-label/index.ts",
  "supabase/functions/jmb-create-guest-request/index.ts",
  "supabase/functions/jmb-send-invoice/index.ts",
];

const backupDir = path.join(root, ".jmb-phase4-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const file of copies) {
  const current = path.join(root, file);
  if (fs.existsSync(current)) {
    const backup = path.join(backupDir, file.replaceAll("/", "__"));
    if (!fs.existsSync(backup)) fs.copyFileSync(current, backup);
  }
}

// Avoid two competing @/lib/cart modules if an older .ts version exists.
const legacyCart = path.join(root, "src/lib/cart.ts");
if (fs.existsSync(legacyCart)) {
  const backup = path.join(backupDir, "src__lib__cart.ts");
  if (!fs.existsSync(backup)) fs.copyFileSync(legacyCart, backup);
  fs.rmSync(legacyCart);
  console.log("Removed legacy src/lib/cart.ts (backed up)");
}

for (const file of copies) {
  const source = path.join(filesDir, file);
  if (!fs.existsSync(source)) {
    console.error(`Phase 4 package is missing ${file}`);
    process.exit(1);
  }
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Updated ${file}`);
}

const envPath = path.join(root, ".env.example");
const envText = "# Browser-safe Supabase connection values\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n";
if (!fs.existsSync(envPath)) fs.writeFileSync(envPath, envText);
else if (!fs.readFileSync(envPath, "utf8").includes("VITE_SUPABASE_URL")) fs.appendFileSync(envPath, `\n${envText}`);

console.log("\nOperational Phase 4 applied.");
console.log("Next: npm run build");
console.log("Then run supabase/jmb-operational-phase4.sql and deploy the included Edge Functions.");
console.log("See jmb-operational-phase4/README-PHASE4.md for EasyPost + email secrets and deployment commands.");
