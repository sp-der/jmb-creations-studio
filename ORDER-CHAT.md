# Storefront order chat and recoverable deletion

Every storefront order uses `jmb_order_messages` through `jmb-order-communications`.
The existing implementation follows PNP's server authorization, private guest-token,
per-order request ID, atomic message/outbox, five-second polling and durable worker architecture.
Custom-request tables and Custom Chats are unchanged.

## Admin and customer access

Orders opens all active storefront orders by default. **Order Chat** is near the top
of the selected order. Orders show unread counts; opening the thread acknowledges
only fetched messages. Registered customers use `/orders/$orderId`; guests retain
their original `/guest/order/$orderId?token=...` links without creating accounts.
Sender roles, identities and recipients are determined server-side. Message retries
reuse a request ID; rate limiting allows twenty messages per side/order/minute.

**Delete Order** requires confirmation naming the order/customer. It sets
`jmb_orders.deleted_at` / `deleted_by`, records a private audit event, and retains
items, shipping information, payment identifiers and conversations. **Trash** shows
deletion dates, read-only chat history and **Restore Order**. Deletion does not cancel
Square links, release inventory, refund charges, or remove provider records. Existing
Square links may still accept money: late verified payments are retained for
reconciliation without restarting fulfillment or notifying customers.

Only a live authenticated administrator can call delete/restore through the Edge
handler. The service-only database RPC independently checks the administrator ID.
Browsers have no DELETE or deletion-column UPDATE privileges. Queued notifications
are suppressed when deleted and are not automatically replayed after restoration.
New chat, checkout and fulfillment actions are blocked while deleted. Operational
leases make deletion wait for in-flight label purchases/manual reviews and delivery.
Old guest RPCs also exclude deleted orders. Customer order lists exclude deleted
orders; authorized existing links show a removed-order state.

## Notifications

The existing Resend sender and business notification address are reused. Browser
requests cannot select recipients. User text is HTML-escaped. Message and outbox
inserts are transactional. The worker freezes payloads, leases jobs, retries with
backoff and a stable Resend idempotency key, and stops ambiguous sends before the
24-hour provider window. The existing minute cron processes jobs with pages closed.
Delivery state, attempts, provider ID and errors remain visible through the existing
Email Customer delivery panel. Historical messages are never automatically queued.

## Deployment and verification — November 1, 2026

- Applied `20261101223306_order_trash_and_chat_visibility.sql` to JMB2C.
- Deployed communications, guest access, Square checkout, buy-label, manual-review,
  manual-submission, and both Square webhook functions.
- 23 Node/PostgreSQL/Edge tests passed, including authorization, token isolation,
  request deduplication, rate limits, Resend outages/retries, soft deletion,
  restoration, leases, late payments and payment/item/chat preservation.
- `supabase/tests/order_trash.sql` passed under the actual production service role,
  with the complete fixture transaction rolled back and no email sent.
- Controlled live guest tests passed: missing/invalid tokens, guest delete/restore
  rejection, durable send, duplicate/conflicting retry and original private link.
- Live delete/restore was tested only on a synthetic deployment-test order.
  Archived guest access returns a tombstone; chat/payment requests are blocked.
  The synthetic order was left in Trash. No real customer order was deleted.
- Resend confirmed **delivered** for customer-to-JMB at the configured business inbox
  and admin-to-customer at `delivered@resend.dev`. Each queue job completed once.
- Browser tests passed against the production build with mock external APIs:
  admin messaging/email, confirmation/cancel, Trash/read-only history, restore,
  Custom Chats, guest/registered portals, mobile layout and checkout recovery.
- Cloudflare production build, affected UI ESLint and six Edge entrypoint Deno
  checks passed. Full TypeScript checking has pre-existing unrelated errors; a
  baseline comparison found 65 diagnostics before this change and 63 afterward.
  Full-repository lint also has existing failures (1,793 errors on baseline;
  1,641 before the final formatting pass). Existing explicit-any shipping types
  were left unchanged.
- GitHub source is published through the Cloudflare Workers integration to the
  existing `jmb-creations-studio` Worker. GitHub Pages is disabled and no GitHub
  Actions workflow is configured. The chat/delete commit's Cloudflare check failed.
  Added explicit Wrangler configuration so Nitro no longer derives the incorrect
  `sp-der-jmb-creations-studio` Worker name from the repository URL. Release status
  must be verified through the Cloudflare check and the public site after pushing.
- Aligned the Trash migration filename with its actual recorded production version
  (`20261101223306`). This repairs repository/database migration history without
  rerunning or modifying the production schema.

Relevant files: `src/components/admin/OrderManager.tsx`,
`src/components/orders/OrderConversation.tsx`, `src/lib/orders.ts`, both customer
order routes and the payment route; the migration and shared Edge access/outbox
helpers; affected order/payment/shipping handlers; `tests/order-*.test.mjs`,
`tests/browser-orders.cjs`, and `supabase/tests/order_trash.sql`.

## Re-run checks

```sh
npm run test:orders
npm run build
npx tsc --noEmit
npx deno check supabase/functions/jmb-order-communications/index.ts
```

The browser test accepts `JMB_PLAYWRIGHT_MODULE`, `JMB_CHROMIUM_EXECUTABLE`,
`JMB_CHROMIUM_ARGS_MODULE`, and optional `JMB_BROWSER_SERVER_ENTRY` (for a Node
production build). Its external API traffic is intercepted and cannot send real
payments/email. Compile browser-test builds with test-only public Supabase values.
Do not publish those test builds.

Keep deletion columns and audit history during any application rollback. Restore
orders through the authorized RPC/UI; do not drop metadata or purge records to undo
an application release.
