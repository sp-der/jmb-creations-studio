# Checkout and order communications upgrade

## Release status

Implemented and tested locally; **not deployed to production**. Live Supabase schema, deployed functions, environment configuration, logs and security advisories could not be inspected: the connected account lists project `jtrgjlnuoduhxwfqsgap` (JMB2C), but project-level operations return `You do not have permission to perform this action`. Do not merge the frontend into the production branch before deploying its database and function dependencies.

The existing production homepage returned HTTP 200. The repository builds a Cloudflare Worker using Nitro; no Cloudflare management integration was found. Cloudflare response headers alone do not identify the deployed Worker/account or prove its current commit. The connected Resend account lists verified PNP and Furniture3R domains, but no JMB domain. JMB may use a different Resend account. Neither sender configuration nor live delivery was verified. No real charges, customer test messages, historical notifications or deletions were performed. The three reported same-name orders could not be investigated without order-record access.

## Behavior and transition

New storefront records have `checkout_version=2`, status `Pending Checkout`, and unpaid payment status. Existing rows retain version 1, their original timestamps/status/payment records and private links. No historical backfill or email blast occurs. The old order-creation RPC is retired from client/service-role use; the replacement requires an idempotency key. Retry of identical checkout data returns the same checkout; changed data with the same key is rejected.

Local Pickup shipping is forced to zero in SQL and the server. Catalog prices/stock come from SQL; shipping prices are retrieved from Shippo, with destination region checked. Checkout goes straight to Square. Manual payment methods are absent from the payment UI and blocked server-side for version 2. Historical manual reviews and independent custom invoicing remain available. A historical already-submitted manual payment displays a warning against paying twice.

A redirect, success URL or browser request cannot mark an order paid. Both existing webhook routes verify Square's signature over the exact URL and raw body, then retrieve the payment from Square. Completed status, payment/order ID, configured location, USD currency and exact total are required. Payment recording locks the order, preserves its first confirmation time and atomically queues business/customer emails once. Duplicate webhook delivery cannot queue a second pair. Additional payments or mismatches require reconciliation instead of silently replacing a payment ID. Failed, cancelled and abandoned payment attempts leave a recoverable unpaid checkout with no paid-order emails and no fulfillment access.

The cart is preserved through checkout interruption, and the same browser keeps a recovery link and stable request key. It clears only after verified payment and only if the cart still matches the checkout. Pending checkouts retain the existing stock-reservation behavior. Admins can explicitly close a version-2 unpaid checkout: Square checkout creation/closure is serialized, the Square link is cancelled and its order state verified, then stock is released transactionally once. Unknown payment activity or provider failures keep stock reserved for review. There is **no automatic abandoned-checkout expiration** or historical cleanup. A paid checkout never releases stock through this action.

Admin order lists separate paid orders from unpaid records, show new-order/message badges, date/time, account/guest identity, payment/fulfillment state, customer email and account reference. Server guards prevent unpaid production/fulfillment transitions. Direct browser updates are limited to operational status/tracking fields; Square payment fields are server-managed.

## Conversations, email and authorization

One persistent thread per order appears in the admin order details, Customer Inbox, customer account order details and guest order portal. Customer Inbox separates Order Conversations from the unchanged Custom Requests implementation.

Every order-chat request validates a live Auth user and database admin membership, account ownership, or an order-specific guest token. User-editable metadata and client-supplied sender names/roles/recipients are never used for authorization. Guest access works even when the browser has an unrelated signed-in customer account. Original guest hashes are preserved; supplementary notification tokens are encrypted using pgcrypto with a Vault-held key and are valid for only the corresponding guest order. Tokens and private payloads are not exposed through new public tables/RPCs. Private pages suppress referrer leakage.

Messages and notification jobs commit together. Per-order request IDs deduplicate retries and reject changed body/sender reuse; row locking enforces 20 messages per sender type per minute and 4,000-character text limits. The browser retains a failed send's request ID until the body changes. Threads poll every five seconds while visible; inbox badges poll every ten seconds. Only fetched messages are marked read. Thread reads are paginated.

Email Customer composes a subject and message against the order's stored customer email, server-checks administrator access, includes the order reference, caps sending at 30 composed emails per admin/hour, deduplicates retries and records delivery results. `mailto:` remains available.

A service-role-only outbox stores leases, payloads, attempts, next retry time, provider IDs and sanitized errors. The worker freezes payloads before attempting delivery and sends `jmb-order-<outbox-id>` Resend idempotency keys. Vault-authenticated cron drains due jobs every minute with all browsers closed. Five jobs per lease keep processing inside a two-minute lease. Transient failures back off; permanent errors and ambiguous deliveries older than 23 hours enter `needs_review`, before Resend's 24-hour key expiry. Do not reset those jobs without checking Resend. “Sent” means **accepted by Resend**, not verified inbox delivery. The admin delivery panel reflects that distinction. Provider error bodies and message contents are not logged.

## Supabase changes

Migration: `supabase/migrations/20261026194818_checkout_order_communications.sql` (created with Supabase CLI).

- Additive checkout version/key/fingerprint, confirmation/read/closure/lease timestamps and stored Square URL; item stock-reservation flag.
- Extend order status constraint with Pending Checkout; preserve historical values.
- New `jmb_order_messages`, `jmb_notification_outbox` and private encrypted guest-token table, all with RLS and no anon/authenticated grants.
- Server-only payment confirmation, guest validation/token, message, composed-email, outbox-claim, checkout-lock and stock-release RPCs.
- Payment/outbox trigger, unpaid-fulfillment guard, restricted browser order updates.
- Vault encryption/worker keys and minute cron job, using existing Supabase infrastructure.

Dependencies: existing phases 2/3/4/9 schemas, pgcrypto in `extensions`, Supabase Vault, pg_cron and pg_net. Live schema must be compared with repository definitions before applying. No migration or Edge Function was applied to the live project.

## Deployment order once project access is restored

1. Confirm the actual production Cloudflare project/branch and inspect live tables, constraints, functions, migrations, logs and security advisories. The repository's older schema files are not proof of the current live schema. Take the normal database backup/checkpoint.
2. Verify existing secrets without printing values: `RESEND_API_KEY`, `JMB_FROM_EMAIL`, `JMB_NOTIFICATION_EMAIL` (fallback existing `SUPPORT_EMAIL`), `SITE_URL`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT`, both existing webhook signature/notification-URL pairs, and existing Shippo configuration. Do not invent a recipient or silently use Resend's test sender. Confirm the business timezone; frontend `VITE_JMB_TIMEZONE` and backend `JMB_TIMEZONE` currently default to `America/Los_Angeles` as an explicit, unverified assumption. Do not infer the timezone from Supabase's database region.
3. Apply the reviewed migration through the existing migration workflow. Its Vault keys are generated inside SQL. The CLI supports `supabase functions deploy <names> --project-ref jtrgjlnuoduhxwfqsgap`; use `supabase/config.toml` to preserve internal auth for guest/webhook/worker routes.
4. Deploy only these changed/new functions: `jmb-create-order`, `jmb-create-square-checkout`, `jmb-guest-order-access`, `jmb-manual-payment-sent`, `jmb-review-manual-payment`, `jmb-square-webhook`, `jmb-square-webhook-production`, `jmb-order-communications`, `jmb-cancel-checkout`. Include their `_shared` dependencies. Keep the existing webhook URLs. Confirm canonical return links target `https://jmb2creations.com` and Square environment/credentials match.
5. Merge the tested branch into the established production branch and verify the actual Cloudflare build/deployment ID and active version. Coordinate the backend/frontend transition; old checkout requests fail closed while the new checkout is rolled out, rather than creating unpaid confirmed-looking orders.
6. Run controlled Square sandbox/Resend sink tests and authorized admin/customer browser checks, test RLS with both original and supplemental guest tokens, verify cron/lease recovery, inspect security advisors and logs, and verify production screens after rollout. Never run live test payments with a real customer's card or send tests to real customer addresses.

Keep additive schema/queue data if reverting the frontend. Reverting only the frontend is not a complete rollback: the old order RPC is deliberately retired. Do not roll back payment guards or resurrect old unpaid-confirmation behavior to hide a deployment failure. Coordinate any rollback across backend and frontend.

## Verification

`npm ci` installs pinned test dependencies; production dependencies are unchanged. Node 24+ is required for the test runner's native TypeScript import/hook support.

- `npm run test:orders`: real PostgreSQL/WASM (PGlite + pgcrypto) schema/SQL tests and mocked Edge handler/Square/Resend tests. Only hosted Auth/Vault/Cron/pg_net adapters are stubbed; application migration SQL runs unchanged except the two unavailable hosted extension-install statements. These tests do not prove hosted cron execution, Vault integration or live provider delivery.
- `npx deno check --node-modules-dir=manual` against all nine changed function entrypoints: passes with pinned SDK installed locally. Same entrypoints were independently checked in an isolated Deno environment.
- `npm run build`: passes, produces Cloudflare Worker output.
- Full TypeScript baseline: 77 errors; after this change: 65 errors, **no new diagnostic signatures**. Existing catalog, invoice, router search-parameter and unrelated Custom Chats type issues remain. Full-project lint also has extensive existing failures; new modules pass targeted ESLint.
- `tests/browser-orders.cjs`: local Chromium with intercepted external HTTP requests verifies admin chat/email, both inbox categories, guest/account portals, mobile overflow, Square-only UI, pickup and interrupted-payment cart recovery. Requires Playwright externally installed; optional `JMB_PLAYWRIGHT_MODULE`, `JMB_CHROMIUM_EXECUTABLE` and `JMB_CHROMIUM_ARGS_MODULE` select an existing browser runtime. All network services are mocked; the script never operates production.
- Desktop/mobile screenshots inspected during testing. The browser tests caught and resolved duplicate sibling keys and mobile header overflow.

Live Square payment/notification delivery, the three historical orders, deployed secrets, hosted security advisors and Cloudflare deployment/app logs remain unverified due the access blockers above.

Primary references: PNP `ORDER-CHAT.md`, order-chat function/migrations; [Square webhook validation](https://developer.squareup.com/docs/webhooks/step3validate), [GetPayment](https://developer.squareup.com/reference/square/payments-api/get-payment), [DeletePaymentLink](https://developer.squareup.com/reference/square/checkout-api/delete-payment-link), [Supabase scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
