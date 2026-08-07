# JMB Operational Phase 10 — Guest Payment Portal Repair

Fixes guest orders failing to open immediately after checkout.

- Checkout carries the private order token into the payment URL and keeps a sessionStorage fallback.
- Payment page remembers a token received from the private URL.
- Guest order/payment reads use a dedicated `jmb-guest-order-access` Edge Function instead of the fragile order RPC.
- The new function validates the guest token with the same SHA-256 helper used during order creation, then returns the safe order and items.
- This also strengthens `/guest/order/:orderId`, because the shared guest order fetchers use the same function.

Apply:

```bash
unzip -o jmb-operational-phase10.zip
node jmb-operational-phase10/apply-jmb-operational-phase10.mjs
npx supabase functions deploy jmb-guest-order-access --no-verify-jwt
npm run build
npm run dev -- --host 0.0.0.0 --port 8080
```

Create a brand-new guest order after applying the patch for the cleanest end-to-end test.
