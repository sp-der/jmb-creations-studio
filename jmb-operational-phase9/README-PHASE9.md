# JMB 2 Creations — Operational Phase 9

This phase adds:

- live shipping-origin settings in Admin instead of requiring the address to live only in secrets
- inline Create Account from checkout
- Continue to Payment checkout flow
- payment portal with Square, Zelle, PayPal and Venmo
- provider logos and JMB payment details
- customer payment memo/reference reminder using name + order number
- Payment Sent for manual methods
- admin manual-payment review (Mark Paid / Not Received)
- Square hosted checkout starter
- Square payment webhook that marks matching orders Paid automatically
- shipping-label purchase blocked until payment is Paid

## Apply

```bash
unzip -o jmb-operational-phase9.zip
node jmb-operational-phase9/apply-jmb-operational-phase9.mjs
npm run build
```

## Supabase SQL

Run this in the SQL Editor after the earlier JMB migrations:

```text
supabase/jmb-payments-phase9.sql
```

## Deploy Edge Functions

```bash
npx supabase functions deploy jmb-shipping-rates --no-verify-jwt
npx supabase functions deploy jmb-manual-payment-sent --no-verify-jwt
npx supabase functions deploy jmb-create-square-checkout --no-verify-jwt
npx supabase functions deploy jmb-square-webhook --no-verify-jwt
```

## Shipping

The EasyPost API key remains a Supabase Edge Function secret:

```text
EASYPOST_API_KEY
```

After applying the SQL, sign in to JMB Admin and open **Shipping & Payments**. Enter the real JMB ship-from address there. The shipping-rate function reads that database setting first and falls back to the older `JMB_SHIP_FROM_*` secrets only if needed.

Product parcel weights/dimensions still come from the live catalog. Accurate product package values produce more accurate live rates.

## Manual payments

From **Admin → Shipping & Payments**, enter the customer-facing details for:

- Zelle
- PayPal
- Venmo

Customers see the exact order total and are instructed to include their name or JMB order number in the payment memo. When they press **Payment Sent**, the order becomes `Pending` for JMB review. JMB then verifies the provider directly and presses **Mark Paid**.

## Square

Add these as Supabase Edge Function secrets later:

```text
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_NOTIFICATION_URL=https://YOUR_PROJECT.supabase.co/functions/v1/jmb-square-webhook
```

Then add a Square Developer webhook subscription to the exact `SQUARE_WEBHOOK_NOTIFICATION_URL` and subscribe to:

```text
payment.created
payment.updated
```

The webhook verifies the Square HMAC signature, matches Square's order ID to the JMB order, verifies the amount, and only then marks the order Paid.

Do not put Square access tokens or webhook signature keys in `VITE_` variables or in the browser.
