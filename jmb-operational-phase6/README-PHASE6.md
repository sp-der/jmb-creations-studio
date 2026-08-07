# JMB Operational Phase 6 — Live Gallery Sync

This phase makes customer-facing image galleries database-driven.

## What changes
- Existing imported WebP images remain visible.
- Every unique active design in `jmb_catalog_items` is also rendered in the product thumbnail strip.
- A design with 12oz / 16oz / 24oz variants appears only once in the gallery.
- Clicking a live koozie image selects that design, then the customer chooses its available size.
- Newly uploaded active designs also appear on their Category page.
- No GitHub image upload or redeploy is needed for future catalog additions.

## Apply
```bash
unzip -o jmb-operational-phase6.zip
node jmb-operational-phase6/apply-jmb-operational-phase6.mjs
npm run build
```

Then restart Vite if the dev server was already running.
