import { customerAuthHeaders, getCustomerSession, getValidCustomerSession, getSupabaseAnonKey, getSupabaseRestUrl, getSupabaseUrl } from "@/lib/customer-auth";
import { getAdminAuthHeaders } from "@/lib/live-catalog";
import type { CartItem } from "@/lib/cart";

export type FulfillmentMethod = "Shipping" | "Local Pickup";
export type OrderStatus = "Order Received" | "Payment Confirmed" | "In Production" | "Ready for Pickup" | "Shipped" | "Completed" | "Cancelled";

export type JmbOrder = {
  id: string;
  order_number: number;
  customer_user_id: string | null;
  first_name: string;
  last_name: string;
  customer_email: string;
  fulfillment: FulfillmentMethod;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  status: OrderStatus;
  payment_status: "Unpaid" | "Pending" | "Paid" | "Refunded";
  payment_method: "Square" | "Zelle" | "PayPal" | "Venmo" | null;
  payment_submitted_at: string | null;
  square_payment_link_id: string | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  easypost_shipment_id: string | null;
  easypost_rate_id: string | null;
  label_url: string | null;
  tracking_code: string | null;
  tracking_carrier: string | null;
  tracking_status: string | null;
  created_at: string;
  updated_at: string;
};

export type JmbOrderItem = {
  id: string;
  order_id: string;
  catalog_item_id: string | null;
  name: string;
  option: string | null;
  team: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  image_url: string | null;
};

export type ShippingRate = {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  deliveryDays: number | null;
  shipmentId: string;
};

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

async function functionHeaders(includeCustomer = false) {
  const anonKey = getSupabaseAnonKey();
  if (!anonKey) throw new Error("Supabase is not configured.");
  const customer = includeCustomer ? (await getValidCustomerSession())?.access_token : undefined;
  return {
    apikey: anonKey,
    ...(customer ? { Authorization: `Bearer ${customer}` } : {}),
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const text = await response.text();
  try { const data = JSON.parse(text); return data.error || data.message || text; } catch { return text || `${response.status} ${response.statusText}`; }
}

export function orderCode(order: Pick<JmbOrder, "order_number">) {
  return `JMB-${String(order.order_number).padStart(4, "0")}`;
}

export function buildParcelFromCart(items: CartItem[]) {
  const weight = items.reduce((sum, item) => sum + (Number(item.weightOz) || 8) * item.quantity, 0);
  const length = Math.max(8, ...items.map((item) => Number(item.lengthIn) || 8));
  const width = Math.max(6, ...items.map((item) => Number(item.widthIn) || 6));
  const height = Math.max(4, items.reduce((sum, item) => sum + (Number(item.heightIn) || 4) * item.quantity, 0));
  return { weightOz: Math.round(weight * 100) / 100, lengthIn: length, widthIn: width, heightIn: height };
}

export async function fetchShippingRates(address: ShippingAddress, items: CartItem[]) {
  const url = getSupabaseUrl();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-shipping-rates`, {
    method: "POST",
    headers: await functionHeaders(Boolean(getCustomerSession())),
    body: JSON.stringify({ address, parcel: buildParcelFromCart(items) }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json() as { rates: ShippingRate[] };
  return data.rates;
}

export async function createOrder(input: {
  firstName: string;
  lastName: string;
  email: string;
  fulfillment: FulfillmentMethod;
  address?: ShippingAddress;
  items: CartItem[];
  shipmentId?: string;
  rateId?: string;
}) {
  const url = getSupabaseUrl();
  if (!url) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-create-order`, {
    method: "POST",
    headers: await functionHeaders(Boolean(getCustomerSession())),
    body: JSON.stringify({
      ...input,
      items: input.items.map((item) => ({ catalogItemId: item.productId, quantity: item.quantity })),
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json() as { order: JmbOrder; guestToken?: string; accessUrl?: string; emailSent?: boolean };
}

export async function fetchCustomerOrder(orderId: string) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`, { headers: await customerAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as JmbOrder[];
  return rows[0] ?? null;
}

export async function fetchCustomerOrders() {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_orders?select=*&order=created_at.desc`, { headers: await customerAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JmbOrder[];
}

export async function fetchCustomerOrderItems(orderId: string) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_order_items?order_id=eq.${encodeURIComponent(orderId)}&select=*&order=created_at.asc`, { headers: await customerAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JmbOrderItem[];
}

export async function fetchAdminOrders() {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_orders?select=*&order=created_at.desc`, { headers: getAdminAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JmbOrder[];
}

export async function fetchAdminOrderItems(orderId: string) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_order_items?order_id=eq.${encodeURIComponent(orderId)}&select=*&order=created_at.asc`, { headers: getAdminAuthHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JmbOrderItem[];
}

export async function updateAdminOrder(orderId: string, patch: Partial<Pick<JmbOrder, "status" | "payment_status" | "tracking_code" | "tracking_carrier" | "tracking_status">>) {
  const base = getSupabaseRestUrl();
  const response = await fetch(`${base}/jmb_orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { ...getAdminAuthHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = (await response.json()) as JmbOrder[];
  return rows[0];
}

export async function buyOrderLabel(orderId: string) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const adminHeaders = getAdminAuthHeaders();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-buy-label`, {
    method: "POST",
    headers: { ...adminHeaders, apikey: anonKey },
    body: JSON.stringify({ orderId }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json() as { order: JmbOrder; labelUrl: string; trackingCode: string; emailSent?: boolean };
}

async function guestOrderAccess(orderId: string, token: string) {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) throw new Error("Supabase is not configured.");
  if (!token) throw new Error("Private order token is required.");
  const response = await fetch(`${url}/functions/v1/jmb-guest-order-access`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, token }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json() as { order: JmbOrder; items: JmbOrderItem[] };
}

export async function fetchGuestOrder(orderId: string, token: string) {
  const result = await guestOrderAccess(orderId, token);
  return result.order ?? null;
}

export async function fetchGuestOrderItems(orderId: string, token: string) {
  const result = await guestOrderAccess(orderId, token);
  return result.items ?? [];
}

export async function reviewManualPayment(orderId: string, approved: boolean) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-review-manual-payment`, {
    method: "POST",
    headers: { ...getAdminAuthHeaders(), apikey: anonKey },
    body: JSON.stringify({ orderId, approved }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json() as { order: JmbOrder; emailSent?: boolean };
}
