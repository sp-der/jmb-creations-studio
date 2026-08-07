#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const pkg = path.dirname(fileURLToPath(import.meta.url));
const files = path.join(pkg, "files");
const targets = [
  "src/lib/orders.ts",
  "src/routes/checkout.tsx",
  "src/routes/payment.$orderId.tsx",
  "supabase/functions/jmb-guest-order-access/index.ts",
];

for (const required of ["src/lib/orders.ts", "src/routes/checkout.tsx", "src/routes/payment.$orderId.tsx", "supabase/functions/_shared/jmb.ts"]) {
  if (!fs.existsSync(path.join(root, required))) {
    console.error(`Missing ${required}. Run this from the current JMB repo root after Phase 9.`);
    process.exit(1);
  }
}

const backupDir = path.join(root, ".jmb-phase10-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const target of targets) {
  const current = path.join(root, target);
  if (fs.existsSync(current)) {
    const backup = path.join(backupDir, target.replaceAll("/", "__"));
    if (!fs.existsSync(backup)) fs.copyFileSync(current, backup);
  }
  const source = path.join(files, target);
  if (!fs.existsSync(source)) {
    console.error(`Phase 10 package is missing ${target}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(current), { recursive: true });
  fs.copyFileSync(source, current);
  console.log(`Updated ${target}`);
}

console.log("\nOperational Phase 10 applied.");
console.log("Next:");
console.log("  npx supabase functions deploy jmb-guest-order-access --no-verify-jwt");
console.log("  npm run build");
console.log("  restart npm run dev");
