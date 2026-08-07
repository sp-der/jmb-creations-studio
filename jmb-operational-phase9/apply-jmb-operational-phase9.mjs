#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(packageDir, "files");

const required = [
  "src/routes/checkout.tsx",
  "src/routes/admin.tsx",
  "src/lib/orders.ts",
  "src/components/admin/OrderManager.tsx",
  "supabase/functions/jmb-shipping-rates/index.ts",
  "supabase/functions/_shared/jmb.ts",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing ${file}. Run this from the current JMB repo root after the earlier operational phases.`);
    process.exit(1);
  }
}

const copies = [
  "src/lib/orders.ts",
  "src/lib/payments.ts",
  "src/routes/checkout.tsx",
  "src/routes/payment.$orderId.tsx",
  "src/routes/admin.tsx",
  "src/components/admin/OrderManager.tsx",
  "src/components/admin/StorePaymentSettings.tsx",
  "supabase/jmb-payments-phase9.sql",
  "supabase/functions/jmb-shipping-rates/index.ts",
  "supabase/functions/jmb-manual-payment-sent/index.ts",
  "supabase/functions/jmb-create-square-checkout/index.ts",
  "supabase/functions/jmb-square-webhook/index.ts",
];

const backupDir = path.join(root, ".jmb-phase9-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const file of copies) {
  const current = path.join(root, file);
  if (fs.existsSync(current)) {
    const backup = path.join(backupDir, file.replaceAll("/", "__"));
    if (!fs.existsSync(backup)) fs.copyFileSync(current, backup);
  }
}

for (const file of copies) {
  const source = path.join(filesDir, file);
  if (!fs.existsSync(source)) {
    console.error(`Phase 9 package is missing ${file}`);
    process.exit(1);
  }
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Updated ${file}`);
}

console.log("\nOperational Phase 9 applied.");
console.log("Next:");
console.log("1) Run supabase/jmb-payments-phase9.sql in Supabase SQL Editor.");
console.log("2) Deploy jmb-shipping-rates, jmb-manual-payment-sent, jmb-create-square-checkout, and jmb-square-webhook.");
console.log("3) npm run build");
console.log("4) In Admin → Shipping & Payments, enter JMB's ship-from address and manual payment details.");
console.log("Square secrets stay server-side and are NOT entered in the admin UI.");
