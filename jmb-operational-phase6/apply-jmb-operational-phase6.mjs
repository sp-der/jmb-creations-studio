#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(packageDir, "files");
const files = ["src/routes/product.$slug.tsx", "src/routes/category.$slug.tsx"];

for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing ${file}. Apply Operational Phase 5 first.`);
    process.exit(1);
  }
}

const backupDir = path.join(root, ".jmb-phase6-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const file of files) {
  const current = path.join(root, file);
  const backup = path.join(backupDir, file.replaceAll("/", "__"));
  if (!fs.existsSync(backup)) fs.copyFileSync(current, backup);
  fs.copyFileSync(path.join(filesDir, file), current);
  console.log(`Updated ${file}`);
}

console.log("\nOperational Phase 6 applied.");
console.log("New Supabase-uploaded catalog designs now join product thumbnail strips and category grids automatically.");
console.log("No SQL migration is required for this phase.");
console.log("Next: npm run build");
