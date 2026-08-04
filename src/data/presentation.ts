import type { Order } from "@/data/orders";

export const SHIPPING_DEMO_ID = "JMB-1041";
export const PICKUP_DEMO_ID = "JMB-1042";
export const CUSTOM_DEMO_ID = "JMB-1043";
export const CUSTOM_REQUEST_ID = "REQ-208";

export const CUSTOM_DEMO_ORDER: Order = {
  id: CUSTOM_DEMO_ID,
  customer: "Demo Customer — Priya S.",
  email: "priya.demo@example.com",
  phone: "(555) 020-1188",
  date: "2026-08-04",
  total: 126,
  fulfillment: "Local Pickup",
  payment: "Pending",
  status: "Order Received",
  pickupDate: "2026-08-29",
  pickupWindow: "To be scheduled",
  items: [
    {
      name: "Custom Pastel Space Bag Charms",
      quantity: 12,
      price: 10.5,
      color: "Lavender, blush pink & pearl white",
      option: "Lobster clip",
      personalization: "12 individual names",
    },
  ],
  customerNote: "Created from custom request REQ-208 after quote approval.",
  adminNote: "Presentation order. Confirm name spelling before printing.",
  referenceImages: 3,
  history: [
    { status: "Custom request submitted", at: "2026-08-04 15:42", by: "Customer" },
    { status: "Quote sent — $126", at: "2026-08-04 15:54", by: "Admin" },
    { status: "Quote accepted", at: "2026-08-04 16:02", by: "Customer" },
    { status: "Order Received", at: "2026-08-04 16:05", by: "Admin" },
  ],
};
