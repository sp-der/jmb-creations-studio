import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const patchRoot = path.join(scriptDir, "patch-files");
const repoRoot = process.cwd();
const packageJson = path.join(repoRoot, "package.json");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, base = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, base)));
    } else if (entry.isFile()) {
      files.push(path.relative(base, fullPath));
    }
  }

  return files;
}

if (!(await exists(packageJson))) {
  console.error("\nCould not find package.json in the current directory.");
  console.error("Open the jmb-creations-studio repository root, then run this installer again.\n");
  process.exit(1);
}

if (!(await exists(patchRoot))) {
  console.error("\nThe patch-files folder is missing. Keep it beside apply-jmb-presentation.mjs.\n");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
let backupRoot = path.join(path.dirname(repoRoot), `jmb-presentation-backup-${stamp}`);

try {
  await fs.mkdir(backupRoot, { recursive: true });
} catch {
  backupRoot = path.join("/tmp", `jmb-presentation-backup-${stamp}`);
  await fs.mkdir(backupRoot, { recursive: true });
}

const files = await walk(patchRoot);
const overwritten = [];
const created = [];

for (const relativePath of files) {
  const sourcePath = path.join(patchRoot, relativePath);
  const destinationPath = path.join(repoRoot, relativePath);

  if (await exists(destinationPath)) {
    const backupPath = path.join(backupRoot, relativePath);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(destinationPath, backupPath);
    overwritten.push(relativePath);
  } else {
    created.push(relativePath);
  }

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
}

console.log("\nJMB presentation upgrade installed successfully.\n");
console.log(`Updated files: ${overwritten.length}`);
console.log(`New files: ${created.length}`);
console.log(`Backup folder: ${backupRoot}`);
console.log("\nNext steps:");
console.log("  npm run dev");
console.log("\nThen test:");
console.log("  /admin");
console.log("  /account");
console.log("  /cart");
console.log("  /custom-orders");
console.log("\nTanStack will regenerate src/routeTree.gen.ts when the dev server starts.\n");
