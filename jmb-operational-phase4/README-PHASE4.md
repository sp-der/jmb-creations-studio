# JMB 2 Creations — Operational Phase 4

This phase adds the real customer/admin workflow around the live catalog.

## Included

- Customer **Remember me** sign-in.
- Customer account sign-up now stores first + last name.
- **Guest checkout** with first name, last name and email.
- **Guest custom requests** with a private chat link emailed to the customer.
- **Guest order status page** with a private emailed link.
- Entire `/admin` route is protected behind a verified Supabase admin login.
- Admin **Product Name Editor** to rename imported labels like `Koozie (1)` without renaming image files.
- Admin **Invoice Maker** using the JMB logo/colors, preset item types, arbitrary custom lines, custom prices, shipping, tax, discount, print/PDF and email.
- Account and guest orders in one **Orders** admin view.
- EasyPost-ready live shipping rates, label purchase, label print URL and automatic tracking email.
- Catalog Manager fields for product weight and package dimensions so live shipping can be accurate.
- Direct-order confirmation email with order details and the shipping message: **shipped within 3–5 business days**.

## Apply code

From the repository root:

```bash
unzip -o jmb-operational-phase4.zip
node jmb-operational-phase4/apply-jmb-operational-phase4.mjs
npm run build
```

## Supabase SQL order

If not already completed, run these in Supabase SQL Editor in this order:

1. `supabase/jmb-catalog-phase2.sql`
2. `supabase/jmb-operations-phase3.sql`
3. `supabase/jmb-operational-phase4.sql`

Phase 4 extends the Phase 2/3 tables. Do not skip directly to Phase 4 on a blank database.

## Admin account

Create JMB's admin user in **Supabase → Authentication → Users**, then add that Auth user's UUID to:

```sql
insert into public.jmb_admins (user_id)
values ('PASTE-JMB-ADMIN-AUTH-UUID-HERE')
on conflict do nothing;
```

`/admin` will now show only the login screen until that authorized account signs in.

## Browser environment variables

These are public browser connection values, not service secrets:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
```

Never put an EasyPost API key, Resend API key or Supabase service-role key in a `VITE_` variable.

## Edge Function secrets

Add these as **server-side Edge Function secrets**:

```text
EASYPOST_API_KEY
RESEND_API_KEY
JMB_FROM_EMAIL
SITE_URL
JMB_SHIP_FROM_NAME
JMB_SHIP_FROM_STREET1
JMB_SHIP_FROM_STREET2   (optional)
JMB_SHIP_FROM_CITY
JMB_SHIP_FROM_STATE
JMB_SHIP_FROM_ZIP
JMB_SHIP_FROM_COUNTRY   (US if omitted)
```

Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.

Example `JMB_FROM_EMAIL` after a sender/domain is verified with your email provider:

```text
JMB 2 Creations <orders@your-domain.com>
```

## Deploy Edge Functions

Public/guest entry points need `--no-verify-jwt` because guests do not have a Supabase Auth JWT:

```bash
supabase functions deploy jmb-shipping-rates --no-verify-jwt
supabase functions deploy jmb-create-order --no-verify-jwt
supabase functions deploy jmb-create-guest-request --no-verify-jwt
```

Admin-only functions require the JMB admin user's access token and should keep JWT verification enabled:

```bash
supabase functions deploy jmb-buy-label
supabase functions deploy jmb-send-invoice
```

## How shipping works

1. Admin enters weight and package dimensions for each ready-made item.
2. Customer enters the delivery address at checkout.
3. `jmb-shipping-rates` creates an EasyPost shipment and returns live carrier rates.
4. Customer chooses a rate. The EasyPost shipment + rate IDs are stored with the order.
5. When JMB is ready to ship, open **Admin → Orders → Buy & Print Label**.
6. `jmb-buy-label` purchases that selected rate through EasyPost.
7. EasyPost returns the printable label and tracking number.
8. JMB's order is changed to `Shipped`, the label opens for printing, and the customer is automatically emailed the tracking number.

Use an EasyPost **test API key first** while testing rates/labels.

## Important payment checkpoint

This package builds the order/guest/shipping/email infrastructure, but it does **not** charge a card yet because a payment processor has not been selected.

Before public launch, connect Stripe, Square, or the selected payment provider so the server-side order creation/confirmation is finalized only after successful payment. Until then, use checkout only for development/testing. This avoids unpaid users consuming ready-stock inventory.
