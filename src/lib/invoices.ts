import { getAdminAuthHeaders, getSupabaseConfig } from "@/lib/live-catalog";

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Void";
export type JmbInvoice = {
  id: string;
  invoice_number: number;
  custom_request_id: string | null;
  customer_name: string;
  customer_email: string;
  status: InvoiceStatus;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type JmbInvoiceLine = {
  id?: string;
  invoice_id?: string;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
};

async function parseError(response: Response) {
  const text = await response.text();
  try { const data = JSON.parse(text); return data.error || data.message || text; } catch { return text || `${response.status} ${response.statusText}`; }
}

export function invoiceCode(invoice: Pick<JmbInvoice, "invoice_number">) {
  return `INV-${String(invoice.invoice_number).padStart(4, "0")}`;
}

export async function createInvoice(input: {
  customRequestId?: string | null;
  customerName: string;
  customerEmail: string;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  notes?: string;
  lines: Array<Omit<JmbInvoiceLine, "id" | "invoice_id" | "line_total" | "sort_order">>;
}) {
  const { url } = getSupabaseConfig();
  if (!url) throw new Error("Supabase is not configured.");
  const subtotal = input.lines.reduce((sum, line) => sum + Math.max(1, line.quantity) * Math.max(0, line.unit_price), 0);
  const total = Math.max(0, subtotal + input.shippingAmount + input.taxAmount - input.discountAmount);
  const response = await fetch(`${url}/rest/v1/jmb_invoices`, {
    method: "POST",
    headers: { ...getAdminAuthHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({
      custom_request_id: input.customRequestId || null,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      status: "Draft",
      subtotal,
      shipping_amount: input.shippingAmount,
      tax_amount: input.taxAmount,
      discount_amount: input.discountAmount,
      total,
      notes: input.notes || null,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const invoices = (await response.json()) as JmbInvoice[];
  const invoice = invoices[0];
  if (!invoice) throw new Error("Invoice was not created.");

  const lineRows = input.lines.map((line, index) => ({
    invoice_id: invoice.id,
    line_type: line.line_type,
    description: line.description,
    quantity: Math.max(1, line.quantity),
    unit_price: Math.max(0, line.unit_price),
    line_total: Math.max(1, line.quantity) * Math.max(0, line.unit_price),
    sort_order: index,
  }));
  const linesResponse = await fetch(`${url}/rest/v1/jmb_invoice_lines`, {
    method: "POST",
    headers: { ...getAdminAuthHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(lineRows),
  });
  if (!linesResponse.ok) throw new Error(await parseError(linesResponse));
  return { invoice, lines: (await linesResponse.json()) as JmbInvoiceLine[] };
}

export async function sendInvoiceEmail(invoiceId: string) {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/functions/v1/jmb-send-invoice`, {
    method: "POST",
    headers: { ...getAdminAuthHeaders(), apikey: anonKey },
    body: JSON.stringify({ invoiceId }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json() as { ok: boolean };
}
