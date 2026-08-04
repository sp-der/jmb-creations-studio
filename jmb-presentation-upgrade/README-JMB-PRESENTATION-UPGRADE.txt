JMB 2 CREATIONS — PRESENTATION UPGRADE

WHAT THIS ADDS
- Presentation admin dashboard at /admin
- Mock online shipping order
- Mock local-pickup order
- Customer portal at /account
- Cart and presentation checkout at /cart
- Shared custom-request chat at /custom-orders
- Customer/admin typing indicator
- Sent/read receipts
- Admin quote workflow
- Convert accepted custom request into a mock order
- Customer order tracking pages
- Product detail pages for existing product-card links
- Contact and legal placeholder routes
- Updated navigation and footer links

IMPORTANT
This is a presentation-only front end. It does not use real authentication,
payments, email, or a database. Demo messages and state are stored in the
browser's localStorage.

INSTALL FROM THE REPOSITORY ROOT
1. Upload jmb-presentation-upgrade.zip to the root of jmb-creations-studio.
2. Run:

   unzip -o jmb-presentation-upgrade.zip
   node jmb-presentation-upgrade/apply-jmb-presentation.mjs
   npm run dev

If you extracted the CONTENTS directly into the repository root instead, run:

   node apply-jmb-presentation.mjs
   npm run dev

TEST THE LIVE CHAT
1. Open /custom-orders in one browser tab.
2. Open /admin in another tab.
3. In the admin dashboard, choose Custom Chats.
4. Type or send messages in either tab.
5. The other tab will show typing, messages, and read receipts.

TEST THE ORDERS
- /orders/JMB-1041 is the shipping order.
- /orders/JMB-1042 is the local-pickup order.
- /cart lets you switch between shipping and pickup checkout previews.
- The custom request can become order JMB-1043 after acceptance and conversion.

AFTER APPROVAL
The next production phase can replace localStorage with Supabase authentication,
real-time chat, persistent orders, Stripe payments, email notifications, and
admin/customer account permissions.

COMMIT AFTER TESTING
   git status
   git add .
   git commit -m "Add presentation admin, order, checkout, and custom chat flows"
   git push
