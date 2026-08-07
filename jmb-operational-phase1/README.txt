JMB 2 Creations - Operational Catalog Phase 1
=============================================

WHAT THIS PHASE DOES
- Uses the 3 Site images as the floating homepage hero images.
- Converts uploaded catalog images to WebP for faster loading.
- Replaces mock product placeholders with real catalog photos.
- Changes /shop to show one card per product family.
- Clicking a product opens its collection of available designs.
- Changes /categories so each category opens every design currently available.
- Uses soap (9) as the Soap Dispensers main image.
- Removes presentation/mockup wording from the homepage/product/catalog experience.
- Does NOT yet replace the admin demo backend. That is Phase 2 with Supabase + R2.

EXPECTED SOURCE FOLDER
Put the extracted JMB2C folder in the repository root so it looks like:

jmb-creations-studio/
  JMB2C/
    Site/
    Soap Dispenser/
    Tap Wands/
    Cosplay/
    Cup Koozies/
    Shelves/

RUN
1. From the jmb-creations-studio repo root:

   python3 -m pip install pillow
   python3 jmb-operational-phase1/prepare-jmb-assets.py ./JMB2C
   node jmb-operational-phase1/apply-jmb-operational-phase1.mjs
   npm run build

2. If the build succeeds:

   npm run dev

3. Check:
   /
   /shop
   /categories
   /category/soap-dispensers
   /product/soap-dispensers
   /product/tap-wands
   /product/cup-koozies
   /product/display-shelves
   /product/cosplay-props

WEBP OUTPUT
Images are written under:
  public/catalog/site/
  public/catalog/products/

The converter uses WebP quality 82 and caps the longest image side at 1600px.

IMPORTANT
Prices are intentionally NOT faked. Phase 1 shows the real catalog and design collections, but direct Add to Cart is held until JMB's real product/design pricing is connected.

PHASE 2
Build the live admin Catalog Manager using:
- Supabase for categories, product families, designs, pricing, stock, and admin auth.
- Cloudflare R2 for product images.
- Browser-side WebP conversion before upload.
- Admin actions:
  * Create category
  * Create product family
  * Add a design to an existing product family
  * Upload main/gallery images
  * Set pricing, stock, visibility, customization options
  * Edit/archive products and designs
