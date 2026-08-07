import { adminClient, corsHeaders, emailShell, json, money, requireAdmin, sendEmail } from "../_shared/jmb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const { invoiceId } = await req.json() as { invoiceId?: string };
    if (!invoiceId) return json({ error: "invoiceId is required." }, 400);
    const client = adminClient();
    const { data: invoice, error } = await client.from("jmb_invoices").select("*").eq("id", invoiceId).single();
    if (error || !invoice) return json({ error: "Invoice not found." }, 404);
    const { data: lines, error: lineError } = await client.from("jmb_invoice_lines").select("*").eq("invoice_id", invoiceId).order("sort_order");
    if (lineError) throw new Error(lineError.message);
    const code = `INV-${String(invoice.invoice_number).padStart(4, "0")}`;
    const rows = (lines ?? []).map((line: any) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee"><strong>${line.quantity}× ${line.description}</strong><div style="font-size:12px;color:#786d80">${line.line_type} • ${money(Number(line.unit_price))} each</div></td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${money(Number(line.line_total))}</td></tr>`).join("");
    await sendEmail({ to: invoice.customer_email, subject: `${code} from JMB 2 Creations`, html: emailShell(`Invoice ${code}`, `<p>Hi ${invoice.customer_name},</p><p>Here is your JMB 2 Creations custom-order invoice.</p><table style="width:100%;border-collapse:collapse">${rows}</table><div style="margin-top:18px;text-align:right"><div>Subtotal: <strong>${money(Number(invoice.subtotal))}</strong></div><div>Shipping: <strong>${money(Number(invoice.shipping_amount))}</strong></div><div>Tax: <strong>${money(Number(invoice.tax_amount))}</strong></div>${Number(invoice.discount_amount) > 0 ? `<div>Discount: <strong>-${money(Number(invoice.discount_amount))}</strong></div>` : ""}<div style="margin-top:8px;font-size:20px">Total: <strong>${money(Number(invoice.total))}</strong></div></div>${invoice.notes ? `<p style="margin-top:22px"><strong>Notes:</strong> ${invoice.notes}</p>` : ""}`) });
    await client.from("jmb_invoices").update({ status: "Sent" }).eq("id", invoiceId);
    return json({ ok: true });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 401); }
});
