import { Mail, Plus, Printer, ReceiptText, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminRequests, requestCode, type CustomRequest } from "@/lib/custom-requests";
import { createInvoice, invoiceCode, sendInvoiceEmail, type JmbInvoice } from "@/lib/invoices";

const PRESET_TYPES = ["Cup Koozie", "Cosplay Sword", "Tap Wand", "Soap Dispenser", "Display Shelf", "Custom Item"];
type DraftLine = { id: string; line_type: string; description: string; quantity: number; unit_price: number };
const newLine = (line_type = "Custom Item"): DraftLine => ({ id: crypto.randomUUID(), line_type, description: line_type === "Custom Item" ? "" : line_type, quantity: 1, unit_price: 0 });

export function InvoiceMaker() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [requestId, setRequestId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([newLine("Cup Koozie")]);
  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [savedInvoice, setSavedInvoice] = useState<JmbInvoice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchAdminRequests().then(setRequests).catch(() => setRequests([])); }, []);
  const selectedRequest = useMemo(() => requests.find((request) => request.id === requestId) ?? null, [requests, requestId]);
  useEffect(() => {
    if (!selectedRequest) return;
    setCustomerName(selectedRequest.customer_name);
    setCustomerEmail(selectedRequest.customer_email);
  }, [selectedRequest?.id]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + Math.max(1, Number(line.quantity) || 1) * Math.max(0, Number(line.unit_price) || 0), 0), [lines]);
  const total = Math.max(0, subtotal + shipping + tax - discount);
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

  function patchLine(id: string, patch: Partial<DraftLine>) { setSavedInvoice(null); setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line)); }
  function removeLine(id: string) { setSavedInvoice(null); setLines((current) => current.length <= 1 ? current : current.filter((line) => line.id !== id)); }

  async function save() {
    if (!customerName.trim() || !customerEmail.trim()) return toast.error("Customer name and email are required.");
    if (lines.some((line) => !line.description.trim())) return toast.error("Every invoice line needs a description.");
    setBusy(true);
    try {
      const result = await createInvoice({
        customRequestId: requestId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        shippingAmount: Math.max(0, shipping),
        taxAmount: Math.max(0, tax),
        discountAmount: Math.max(0, discount),
        notes,
        lines: lines.map(({ line_type, description, quantity, unit_price }) => ({ line_type, description: description.trim(), quantity, unit_price })),
      });
      setSavedInvoice(result.invoice);
      toast.success(`${invoiceCode(result.invoice)} saved`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save invoice."); }
    finally { setBusy(false); }
  }

  async function emailInvoice() {
    if (!savedInvoice) return toast.error("Save the invoice first.");
    setBusy(true);
    try { await sendInvoiceEmail(savedInvoice.id); toast.success("Invoice emailed to customer"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not email invoice."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Custom order billing</p><h1 className="mt-1 text-3xl font-bold">Invoice Maker</h1><p className="mt-2 text-sm text-muted-foreground">Build a JMB-branded invoice from a custom chat or make one from scratch.</p></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><ReceiptText /></span><div><h2 className="text-xl font-bold">Invoice details</h2><p className="text-sm text-muted-foreground">Prices are entered by JMB for each custom order.</p></div></div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold">Attach custom request<select value={requestId} onChange={(event) => setRequestId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">No request / manual invoice</option>{requests.map((request) => <option key={request.id} value={request.id}>{requestCode(request)} • {request.customer_name} • {request.product_family}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Customer name<Input className="mt-2" value={customerName} onChange={(event) => { setSavedInvoice(null); setCustomerName(event.target.value); }} /></label><label className="text-sm font-bold">Customer email<Input className="mt-2" type="email" value={customerEmail} onChange={(event) => { setSavedInvoice(null); setCustomerEmail(event.target.value); }} /></label></div>
            <div className="space-y-3">
              {lines.map((line) => <div key={line.id} className="rounded-2xl border border-border p-4"><div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]"><select value={line.line_type} onChange={(event) => patchLine(line.id, { line_type: event.target.value, description: line.description || event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">{PRESET_TYPES.map((type) => <option key={type}>{type}</option>)}</select><Input value={line.description} onChange={(event) => patchLine(line.id, { description: event.target.value })} placeholder="Description / customization" /></div><div className="mt-3 grid grid-cols-[100px_minmax(0,1fr)_auto] gap-3"><Input type="number" min="1" value={line.quantity} onChange={(event) => patchLine(line.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /><Input type="number" min="0" step="0.01" value={line.unit_price} onChange={(event) => patchLine(line.id, { unit_price: Math.max(0, Number(event.target.value) || 0) })} placeholder="Unit price" /><Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} aria-label="Remove line"><Trash2 /></Button></div></div>)}
            </div>
            <Button variant="soft" onClick={() => setLines((current) => [...current, newLine()])}><Plus /> Add Line</Button>
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold">Shipping<Input className="mt-2" type="number" min="0" step="0.01" value={shipping} onChange={(event) => { setSavedInvoice(null); setShipping(Number(event.target.value) || 0); }} /></label><label className="text-sm font-bold">Tax<Input className="mt-2" type="number" min="0" step="0.01" value={tax} onChange={(event) => { setSavedInvoice(null); setTax(Number(event.target.value) || 0); }} /></label><label className="text-sm font-bold">Discount<Input className="mt-2" type="number" min="0" step="0.01" value={discount} onChange={(event) => { setSavedInvoice(null); setDiscount(Number(event.target.value) || 0); }} /></label></div>
            <label className="block text-sm font-bold">Notes<textarea rows={3} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={notes} onChange={(event) => { setSavedInvoice(null); setNotes(event.target.value); }} /></label>
            <div className="flex flex-wrap gap-3"><Button variant="hero" onClick={() => void save()} disabled={busy}><Save /> {busy ? "Saving..." : "Save Invoice"}</Button><Button variant="soft" onClick={() => window.print()}><Printer /> Print / Save PDF</Button><Button variant="soft" onClick={() => void emailInvoice()} disabled={!savedInvoice || busy}><Mail /> Email Invoice</Button></div>
          </div>
        </section>

        <section id="jmb-invoice-preview" className="overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-soft print:fixed print:inset-0 print:z-[9999] print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-gradient-to-r from-[#f9c9d0] via-[#f6d7e8] to-[#dcd7f4] p-6 sm:p-8"><div className="flex items-center justify-between gap-6"><img src="/logo.png" alt="JMB 2 Creations" className="h-24 w-32 object-contain" /><div className="text-right"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#585aaa]">Invoice</p><h2 className="mt-1 font-display text-3xl font-bold text-[#29233f]">{savedInvoice ? invoiceCode(savedInvoice) : "Preview"}</h2><p className="mt-1 text-sm text-[#6f6680]">JMB 2 Creations</p></div></div></div>
          <div className="p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c83ca]">Bill to</p><p className="mt-2 font-bold text-[#29233f]">{customerName || "Customer Name"}</p><p className="text-sm text-[#6f6680]">{customerEmail || "customer@email.com"}</p></div><div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c83ca]">Created</p><p className="mt-2 text-sm text-[#29233f]">{new Date().toLocaleDateString()}</p>{selectedRequest && <p className="mt-1 text-sm text-[#6f6680]">{requestCode(selectedRequest)}</p>}</div></div>
            <div className="mt-7 overflow-hidden rounded-2xl border border-[#eadde9]"><div className="grid grid-cols-[minmax(0,1fr)_70px_100px] bg-[#faf2f7] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#6f6680]"><span>Item</span><span className="text-center">Qty</span><span className="text-right">Amount</span></div>{lines.map((line) => <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_70px_100px] border-t border-[#eadde9] px-4 py-4 text-sm"><div><p className="font-bold text-[#29233f]">{line.description || line.line_type}</p><p className="mt-1 text-xs text-[#8a8093]">{line.line_type} • {money(line.unit_price)} each</p></div><span className="text-center text-[#29233f]">{line.quantity}</span><span className="text-right font-bold text-[#29233f]">{money(line.quantity * line.unit_price)}</span></div>)}</div>
            <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#6f6680]">Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between"><span className="text-[#6f6680]">Shipping</span><strong>{money(shipping)}</strong></div><div className="flex justify-between"><span className="text-[#6f6680]">Tax</span><strong>{money(tax)}</strong></div>{discount > 0 && <div className="flex justify-between"><span className="text-[#6f6680]">Discount</span><strong>-{money(discount)}</strong></div>}<div className="mt-3 flex justify-between border-t border-[#eadde9] pt-3 font-display text-xl text-[#29233f]"><span>Total</span><strong>{money(total)}</strong></div></div>{notes && <div className="mt-7 rounded-2xl bg-[#faf2f7] p-4 text-sm text-[#6f6680]"><strong className="text-[#29233f]">Notes:</strong> {notes}</div>}<p className="mt-8 text-center text-xs text-[#8a8093]">Thank you for supporting JMB 2 Creations.</p></div>
        </section>
      </div>
    </div>
  );
}
