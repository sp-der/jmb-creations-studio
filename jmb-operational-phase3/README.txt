JMB 2 CREATIONS — OPERATIONAL PHASE 3
====================================

Purpose
-------
Remove the remaining presentation/demo experience and replace it with production-facing pages that are ready for Supabase.

What changes
------------
1. Admin Dashboard
   - Removes demo customers, fake orders, demo sales, reset-demo controls, presentation wording and mock chat data.
   - Keeps the Phase 2 Catalog Manager.
   - Orders now show a truthful empty state until real checkout/order tables are connected.
   - Custom Chats use the new live Supabase custom-request tables once configured.

2. Customer Account
   - Replaces "Demo Customer" portal with real Supabase email/password sign-in + account creation.
   - Signed-in customers can see their custom-request count and open the custom workspace.

3. Custom Orders
   - Removes Presentation Workflow / Reset Demo / Open Admin View / fake REQ-208 conversation.
   - Signed-in customers can create a real custom request.
   - Customers and JMB can send messages in the request chat.
   - Admin can set request status and quote amount.

4. Product page
   - Phase 2 already removed the visible "Selected: ..." line.
   - This updater also performs a small safety cleanup if an older version is present.

Apply
-----
unzip -o jmb-operational-phase3.zip
node jmb-operational-phase3/apply-jmb-operational-phase3.mjs
npm run build

Supabase
--------
Run these in SQL Editor in this order:
1. supabase/jmb-catalog-phase2.sql
2. supabase/jmb-operations-phase3.sql

Then set:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

Create the JMB admin user in Supabase Authentication, copy its User UUID, then run:
insert into public.jmb_admins (user_id) values ('PASTE-ADMIN-UUID-HERE');

Notes
-----
- Catalog Manager admin sign-in and the custom-chat admin use the same secure Supabase Auth session.
- Customer chat currently requires a customer account. This keeps each conversation protected by RLS.
- Real checkout/order persistence is intentionally the next backend step; fake orders are removed instead of being disguised as live orders.
