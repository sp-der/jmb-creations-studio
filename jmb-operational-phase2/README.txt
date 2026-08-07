JMB 2 Creations - Operational Phase 2
=====================================

THIS UPDATE DOES
1. Removes the "Selected: ..." line from product pages.
2. Adds a real Admin > Catalog section backed by Supabase.
3. Admin can attach a sellable ready-made item to an existing product page.
4. Admin fields include:
   - Product page / family
   - Product/design name
   - Team/theme
   - Size (12oz / 16oz / 24oz or custom)
   - Price
   - Ready stock
   - Made-to-order toggle
   - Existing catalog image OR new image upload
5. New uploads are converted in-browser to WebP (quality 82, max 1600px) before upload.
6. Product pages show a "Ready to order" section when live options exist.
7. Ready-made options can be added to the existing cart.
8. Every product page retains a separate "Customize This / Start a Chat" path.
9. Fixes the broken homepage hero logo and installs the supplied JMB logo as public/logo.png.
10. Makes the 3 floating homepage PNGs larger, removes rounded-card outlines, and uses drop shadows only.
11. Removes the most visible presentation/demo wording from the admin dashboard.

APPLY
From the repository root:

  unzip -o jmb-operational-phase2.zip
  node jmb-operational-phase2/apply-jmb-operational-phase2.mjs
  npm run build

SUPABASE SETUP
After the build passes:

1. Open Supabase > SQL Editor.
2. Run:
   supabase/jmb-catalog-phase2.sql
3. In Supabase Authentication, create JMB's admin user.
4. Copy that user's UUID.
5. Run:
   insert into public.jmb_admins (user_id)
   values ('PASTE-ADMIN-AUTH-USER-UUID-HERE');
6. Add to your local .env:

   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY

7. Restart npm run dev.
8. Open /admin and choose Catalog.
9. Sign in with the Supabase admin email/password.

EXAMPLE KOOZIE ENTRIES
Product page: Cup Koozies
Name: Dodgers Blue
Team/theme: Dodgers
Size: 12oz
Price: [JMB price]
Stock: [ready quantity]
Image: choose the Dodgers image

Repeat for 16oz and 24oz if those are separate orderable options.

CUSTOM ORDERS
The ready-made item flow and custom flow stay separate:
- Ready-made: select item > Add to Cart
- Custom: Customize This / Start a Chat

NOTE
The existing static product-family photos remain the visual collection. The live catalog table adds the sellable, priced, stock-aware choices JMB publishes from Admin.
