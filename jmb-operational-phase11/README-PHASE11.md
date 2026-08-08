# JMB Operational Phase 11

Two cleanup fixes for the current operational storefront.

## 1. Link existing gallery photos to existing live products
The original imported gallery photos already exist and do **not** need to be reuploaded.

Phase 11 makes a static gallery photo look for a matching live `jmb_catalog_items` design using:
1. exact image URL/path match first;
2. current display/design name match as a fallback.

When a match exists, clicking the old photo now selects the matching live product on the right, including its live price/stock. The same logic is used in the lower **All Designs** collection.

For Cup Koozies, clicking a linked design selects the design first and still leaves size selection to the customer.

New Admin uploads continue working normally.

## 2. Remove Presentation Links
Removes the leftover public card containing:
- Customer Portal
- Custom Chat
- Admin Dashboard

The actual account/custom/admin routes are not deleted. Only the presentation shortcut card is removed.

## Apply
From the JMB repo root:

```bash
unzip -o jmb-operational-phase11.zip
node jmb-operational-phase11/apply-jmb-operational-phase11.mjs
npm run build
```

If the build succeeds, run the dev server and test a few old designs, such as an existing Shelf design and an existing Koozie design.

## Backup
The installer keeps changed originals in:

```text
.jmb-phase11-backup/
```

## Deploy after testing

```bash
git add -A
git status
git commit -m "Link existing catalog galleries and remove presentation links"
git push origin main
```
