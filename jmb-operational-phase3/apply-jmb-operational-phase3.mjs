#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(packageDir, "files");

const required = [
  "src/routes/admin.tsx",
  "src/routes/account.tsx",
  "src/routes/custom-orders.tsx",
  "src/components/admin/CatalogManager.tsx",
  "src/lib/live-catalog.ts",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing ${file}. Run this from the JMB repo root after Operational Phase 2.`);
    process.exit(1);
  }
}

const backupDir = path.join(root, ".jmb-phase3-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const file of required) {
  const source = path.join(root, file);
  const backup = path.join(backupDir, file.replaceAll("/", "__"));
  if (!fs.existsSync(backup)) fs.copyFileSync(source, backup);
}

const copies = [
  "src/routes/admin.tsx",
  "src/routes/account.tsx",
  "src/routes/custom-orders.tsx",
  "src/lib/customer-auth.ts",
  "src/lib/custom-requests.ts",
  "supabase/jmb-operations-phase3.sql",
];
for (const file of copies) {
  const source = path.join(filesDir, file);
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Updated ${file}`);
}

// Safety cleanup: Phase 2's product page already removes the visible "Selected:" line.
// If an older Phase 1 product page is still present, remove that one display line without touching state logic.
const productPath = path.join(root, "src/routes/product.$slug.tsx");
if (fs.existsSync(productPath)) {
  let product = fs.readFileSync(productPath, "utf8");
  product = product.replace(/\s*<p[^>]*>Selected:\s*\{?[^<]*<\/p>/g, "");
  product = product.replace(/\s*<p[^>]*>Selected:\s*[^<]*<\/p>/g, "");
  fs.writeFileSync(productPath, product);
  console.log("Checked src/routes/product.$slug.tsx");
}

console.log("\nOperational Phase 3 applied.");
console.log("1) npm run build");
console.log("2) In Supabase, run phase2 SQL first, then supabase/jmb-operations-phase3.sql");
console.log("3) Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY if not already set");
console.log("4) Create JMB admin Auth user and add its UUID to public.jmb_admins");
