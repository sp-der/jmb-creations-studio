# JMB Operational Phase 7 — Guest Custom Chat 404 Fix

This patch fixes the 404 that occurs immediately after a guest creates a custom request.

## Root cause
The Edge Function intentionally returns an `accessUrl` based on the stable `SITE_URL` secret (currently the Cloudflare Workers URL). During development, the browser was navigating directly to that URL even when the current session was running in Codespaces. If Cloudflare had not yet been redeployed with the new guest chat route, it returned the site's 404 page.

## Fix
After a successful guest request, the browser now navigates to the guest chat route on the **current origin**:

`/guest/custom/:requestId?token=...`

The emailed link is unchanged and can continue using the stable Cloudflare URL.

## Apply

```bash
unzip -o jmb-operational-phase7.zip
node jmb-operational-phase7/apply-jmb-operational-phase7.mjs
npm run build
```

Then restart the dev server if needed.

## Production reminder
Before testing the link inside the actual email, redeploy the current JMB build to Cloudflare so `/guest/custom/:requestId` exists on the Workers deployment too.
