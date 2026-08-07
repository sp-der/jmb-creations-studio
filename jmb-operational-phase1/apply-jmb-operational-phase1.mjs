#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const filesDir = path.join(packageDir, "files");

const replacements = [
  "src/data/catalog.ts",
  "src/components/store/ProductCard.tsx",
  "src/routes/shop.tsx",
  "src/routes/categories.tsx",
  "src/routes/category.$slug.tsx",
  "src/routes/product.$slug.tsx",
  "src/routes/index.tsx",
];

const requiredExisting = [
  "src/routes/index.tsx",
  "src/routes/shop.tsx",
  "src/routes/categories.tsx",
  "src/routes/product.$slug.tsx",
  "src/components/store/ProductCard.tsx",
  "src/data/catalog-assets.ts",
];

for (const file of requiredExisting) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing ${file}. Run this from the jmb-creations-studio repo root after prepare-jmb-assets.py.`);
    process.exit(1);
  }
}

const backupDir = path.join(root, ".jmb-phase1-backup");
fs.mkdirSync(backupDir, { recursive: true });
for (const file of replacements) {
  const current = path.join(root, file);
  if (fs.existsSync(current)) {
    const backup = path.join(backupDir, file.replaceAll("/", "__"));
    if (!fs.existsSync(backup)) fs.copyFileSync(current, backup);
  }
}

for (const file of replacements) {
  const source = path.join(filesDir, file);
  if (!fs.existsSync(source)) {
    console.error(`Patch package is missing ${file}`);
    process.exit(1);
  }
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Updated ${file}`);
}

console.log("\nPhase 1 code applied.");
console.log("Next: npm run build");
console.log("Then verify Home, /shop, /categories, /category/soap-dispensers, and the product collection pages.");
