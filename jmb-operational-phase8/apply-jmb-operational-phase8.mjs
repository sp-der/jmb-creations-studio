#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const pkg = path.dirname(fileURLToPath(import.meta.url));
const files = path.join(pkg, "files");
const targets = [
  "src/routes/custom-orders.tsx",
  "src/routes/guest.custom.$requestId.tsx",
  "src/lib/custom-requests.ts",
  "supabase/functions/jmb-guest-custom-access/index.ts",
];

for (const required of ["src/routes/custom-orders.tsx", "src/lib/custom-requests.ts"]) {
  if (!fs.existsSync(path.join(root, required))) {
    console.error(`Missing ${required}. Run this from the JMB repo root after Phase 5/7.`);
    process.exit(1);
  }
}

const backupDir = path.join(root, ".jmb-phase8-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const target of targets) {
  const current = path.join(root, target);
  if (fs.existsSync(current)) {
    const backup = path.join(backupDir, target.replaceAll("/", "__"));
    if (!fs.existsSync(backup)) fs.copyFileSync(current, backup);
  }
  const source = path.join(files, target);
  if (!fs.existsSync(source)) {
    console.error(`Phase 8 package is missing ${target}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(current), { recursive: true });
  fs.copyFileSync(source, current);
  console.log(`Updated ${target}`);
}

console.log("\nPhase 8 applied.");
console.log("Next:");
console.log("  npx supabase functions deploy jmb-guest-custom-access --no-verify-jwt");
console.log("  npm run build");
console.log("  restart npm run dev");
