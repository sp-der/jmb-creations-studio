# JMB Operational Phase 8 — Guest Chat Link Repair

Fixes the guest custom-request flow:

- Automatically opens the newly-created private chat on the current site origin.
- Saves the private token in sessionStorage before navigation as a fallback.
- Guest chat route recovers the token from sessionStorage if the query string is lost.
- Replaces the guest RPC lookup with a dedicated Edge Function that validates the token using the exact same SHA-256 implementation used when the request is created.
- Shows a clear warning if Resend did not actually deliver the email.

## Apply

```bash
unzip -o jmb-operational-phase8.zip
node jmb-operational-phase8/apply-jmb-operational-phase8.mjs
npx supabase functions deploy jmb-guest-custom-access --no-verify-jwt
npm run build
```

Then restart Vite.

## Resend test mode

If `JMB_FROM_EMAIL=onboarding@resend.dev`, Resend only delivers to the email address that owns the Resend account. This is a Resend restriction, not a JMB-site failure. After JMB's real domain is verified, customer emails can be sent to arbitrary recipients.
