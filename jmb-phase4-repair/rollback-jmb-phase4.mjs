#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backupDir = path.join(root, '.jmb-phase4-backup');

if (!fs.existsSync(backupDir)) {
  console.error('Could not find .jmb-phase4-backup. Run this from the JMB repo root where Phase 4 was applied.');
  process.exit(1);
}

const phase4Files = [
  'src/components/admin/CatalogManager.tsx',
  'src/components/admin/DesignNameEditor.tsx',
  'src/components/admin/InvoiceMaker.tsx',
  'src/components/admin/OrderManager.tsx',
  'src/lib/cart.tsx',
  'src/lib/custom-requests.ts',
  'src/lib/customer-auth.ts',
  'src/lib/design-labels.ts',
  'src/lib/invoices.ts',
  'src/lib/live-catalog.ts',
  'src/lib/orders.ts',
  'src/lib/use-design-labels.ts',
  'src/routes/account.tsx',
  'src/routes/admin.tsx',
  'src/routes/cart.tsx',
  'src/routes/category.$slug.tsx',
  'src/routes/checkout.tsx',
  'src/routes/custom-orders.tsx',
  'src/routes/guest.custom.$requestId.tsx',
  'src/routes/guest.order.$orderId.tsx',
  'src/routes/orders.$orderId.tsx',
  'src/routes/product.$slug.tsx',
];

let restored = 0;
let removed = 0;

for (const file of phase4Files) {
  const dest = path.join(root, file);
  const backup = path.join(backupDir, file.replaceAll('/', '__'));

  if (fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(backup, dest);
    console.log(`Restored ${file}`);
    restored++;
  } else if (fs.existsSync(dest)) {
    fs.rmSync(dest);
    console.log(`Removed Phase 4-only file ${file}`);
    removed++;
  }
}

// Restore legacy cart.ts if Phase 4 removed it.
const legacyBackup = path.join(backupDir, 'src__lib__cart.ts');
if (fs.existsSync(legacyBackup)) {
  const legacyDest = path.join(root, 'src/lib/cart.ts');
  fs.mkdirSync(path.dirname(legacyDest), { recursive: true });
  fs.copyFileSync(legacyBackup, legacyDest);
  console.log('Restored src/lib/cart.ts');
}

console.log(`\nPhase 4 rollback complete. Restored ${restored} files; removed ${removed} Phase 4-only files.`);
console.log('Now run: npm run dev');
