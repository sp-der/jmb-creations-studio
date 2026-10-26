# JMB checkout and order communications

## Release evidence — October 26, 2026

JMB2C project `jtrgjlnuoduhxwfqsgap` was inspected using the Sp-der connection. Its original orders/items schema and storefront RPC match repository phases 4/9. Migrations `20261026230248_checkout_order_communications` and `20261026232657_configure_business_notification_email` are applied. Repository filenames match actual database migration versions so the Supabase GitHub integration does not replay them.

All nine changed/new functions are deployed and ACTIVE: jmb-create-order, jmb-create-square-checkout, jmb-guest-order-access, jmb-manual-payment-sent, jmb-review-manual-payment, both existing Square webhook routes, jmb-order-communications and jmb-cancel-checkout. The existing Cloudflare GitHub integration builds service jmb-creations-studio from main. Check the merged commit's Cloudflare build check and production pages for current frontend rollout evidence.

Runtime health confirms production Square credentials authorize the configured location, production webhook secrets exist, SITE_URL is correct, and JMB_FROM_EMAIL is JMB 2 Creations <support@jmb2creations.com>. The otrservicesie Resend account verifies jmb2creations.com for sending. A controlled message to delivered@resend.dev was accepted and reported delivered (provider ID 01a17a74-82a0-7202-9353-805fadeb0390). No real charges or customer test emails were sent.

Notification environment settings were empty. The user selected the existing JMB Yahoo administrator address; it is configured in RLS-protected jmb_store_settings.notification_email. Explicit JMB_NOTIFICATION_EMAIL or SUPPORT_EMAIL settings take precedence; otherwise the worker reads that protected setting. Health verified the selected recipient resolves correctly. It is not invented or hardcoded in application code. The configured Chino Hills, California origin confirms Pacific time is appropriate.

## Payments and inventory

New orders remain Pending Checkout/Unpaid until a signed Square event and retrieved payment record verify completed status, exact order/payment ID, location, USD and amount. Redirects never establish payment. Payment recording and business/customer outbox entries are transactional and idempotent. Unpaid fulfillment is blocked. Local Pickup is forced to zero shipping; merchandise still requires Square payment.

Modern requests use stable browser checkout keys/tokens. Older open tabs get server-generated credentials during rollout but still create only pending checkouts. The cart survives interrupted payments and clears after verified payment only if it still matches that checkout. Existing Square links are reused. New storefront manual payments are blocked; historical records, manual review and independent invoicing remain intact.

Pending checkouts reserve stock. Admin cancellation serializes against checkout creation, confirms Square closure, then releases stock once. Unknown payment activity or provider failures retain reservations for reconciliation. There is no automatic abandoned-checkout expiration or historical cleanup.

## Communications and security

Admin orders show paid/pending filters, creation/payment timestamps, payment/fulfillment states, account/guest identity, customer email/account reference, unread alerts, order chat and Email Customer. Customer Inbox separates Order Conversations from unchanged Custom Requests. Both account and guest portals include chat.

Every request validates live Auth and database admin membership, account ownership or an order-specific guest token. Client sender names/roles/recipients are ignored. Original guest hashes remain valid; encrypted supplemental tokens support notification links. Private pages suppress Referer leakage.

Messages and outbox entries commit atomically. Request IDs deduplicate retries; changed-body/sender reuse is rejected. Messages are capped at 4,000 characters and 20 per sender/order/minute. Threads poll every five visible seconds, inbox badges every ten seconds, and only fetched messages are marked read. Admin emails target the stored order address, include its reference and are capped at 30 per admin/hour with deduplication and delivery records.

The outbox freezes payloads, leases jobs, retries with backoff, uses stable Resend idempotency keys, records provider acceptance and sanitized errors, and stops ambiguous delivery at 23 hours before Resend's 24-hour key expiry. Vault-authenticated minute cron is active. New chat/outbox/token tables have RLS and no public grants; privileged RPCs are service-role-only. Worker-authenticated health exposes no credentials and email tests target only Resend's sink. “Sent” means provider acceptance, not universal inbox delivery.

## Historical investigation

All five original orders remain. The three repeated-name orders (numbers 3, 4 and 5) are Unpaid despite In Production status, while their prior pre-payment thank-you emails appear delivered in Resend. This confirms premature confirmation in the old workflow. No original orders were deleted, charged, reclassified or historically notified. Original timestamps, payments and custom histories remain intact.

## Verification and limitations

- 21 automated tests passed: real PostgreSQL/WASM/pgcrypto migration tests and mocked Edge/Square/Resend tests.
- Production build, nine Edge Function type checks and targeted new-module lint passed. A second type check passed for rollout compatibility and health additions.
- Mocked desktop/mobile Chromium checks passed for admin chat/email, both inbox categories, guest/account portals, mobile overflow, Square-only checkout, pickup and interrupted-payment recovery.
- Live SQL in supabase/tests/order_communications.sql passed original/supplemental/swapped token checks, unpaid fulfillment blocking, duplicate payments/messages and private API grants. Fixtures and queued notifications rolled back.
- Runtime health returned HTTP 200, confirmed the notification recipient, verified production Square location access, and the Resend test sink reports delivered.
- Existing full-project checks are not green: TypeScript 77 baseline -> 65 initial implementation errors, no new diagnostic signatures; lint 1806 baseline -> 1790 initial implementation errors.
- The execution environment became unavailable during rollout. Provider APIs remained available. The final small protected-recipient fallback was accepted by the Supabase bundler and verified live; local checks were not rerun after that adjustment.
- Full sandbox card-payment journeys and authenticated production browser sessions were not exercised. No customer was used as a test subject.
- Security advisors report expected informational RLS-with-no-policy findings for service-only tables. Existing mutable-search-path, legacy token-protected SECURITY DEFINER API and disabled leaked-password-protection warnings remain. See https://supabase.com/docs/guides/database/database-linter.

Preserve additive schema/data on rollback and coordinate backend/frontend together. Never reset needs_review deliveries or release reserved stock without provider reconciliation.
