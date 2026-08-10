import { ExternalLink, Loader2, PackageCheck, Printer, RefreshCcw, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buyOrderLabel, fetchAdminOrderItems, fetchAdminOrders, orderCode, updateAdminOrder, type JmbOrder, type JmbOrderItem, type OrderStatus } from "@/lib/orders";

const STATUSES: OrderStatus[] = ["Order Received", "Payment Confirmed", "In Production", "Ready for Pickup", "Shipped", "Completed", "Cancelled"];

export function OrderManager({ initialOrderId }: { initialOrderId?: string | null } = {}) {
  const [orders, setOrders] = useState<JmbOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<JmbOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [labelBusy, setLabelBusy] = useState(false);
  const selected = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId]);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await fetchAdminOrders();
      setOrders(rows);
      setSelectedId((current) => (initialOrderId && rows.some((order) => order.id === initialOrderId)) ? initialOrderId : (current ?? rows[0]?.id ?? null));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load orders.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (initialOrderId) setSelectedId(initialOrderId); }, [initialOrderId]);
  useEffect(() => {
    if (!selectedId) { setItems([]); return; }
    fetchAdminOrderItems(selectedId).then(setItems).catch(() => setItems([]));
  }, [selectedId]);

  async function setStatus(status: OrderStatus) {
    if (!selected) return;
    try {
      const updated = await updateAdminOrder(selected.id, { status });
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      toast.success(`${orderCode(updated)} updated`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update order."); }
  }


  async function buyLabel() {
    if (!selected) return;
    if (selected.payment_status !== "Paid") return toast.error("Confirm payment before purchasing a shipping label.");
    setLabelBusy(true);
    try {
      const result = await buyOrderLabel(selected.id);
      setOrders((current) => current.map((order) => order.id === result.order.id ? result.order : order));
      toast.success("Shipping label purchased", { description: result.emailSent === false ? `Tracking ${result.trackingCode} was saved, but the customer email failed.` : `Tracking ${result.trackingCode} was emailed to the customer.` });
      if (result.labelUrl) window.open(result.labelUrl, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not purchase label."); }
    finally { setLabelBusy(false); }
  }

  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Order management</p><h1 className="mt-1 text-3xl font-bold">Orders</h1><p className="mt-2 text-sm text-muted-foreground">Manage order status, fulfillment, labels and tracking. Manual payment verification lives in the Payments tab.</p></div>
        <Button variant="soft" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Refresh</Button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between px-2"><h2 className="font-bold">All Orders</h2><Badge variant="secondary">{orders.length}</Badge></div>
          <div className="mt-3 space-y-2">
            {orders.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No customer orders yet.</p> : orders.map((order) => (
              <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full rounded-2xl border p-4 text-left ${selectedId === order.id ? "border-primary/40 bg-secondary/40" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-primary">{orderCode(order)}</p><p className="mt-1 text-sm font-bold">{order.first_name} {order.last_name}</p><p className="mt-1 text-xs text-muted-foreground">{order.fulfillment} • {order.status}</p><p className="mt-1 text-xs font-bold">{order.payment_method || "No payment method"} • {order.payment_status}</p></div><p className="font-bold">{money(order.total)}</p></div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-[1.75rem] border border-border bg-card shadow-soft">
          {!selected ? <div className="p-10 text-center text-sm text-muted-foreground">Choose an order.</div> : <>
            <header className="border-b border-border p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{orderCode(selected)}</p><h2 className="mt-1 text-2xl font-bold">{selected.first_name} {selected.last_name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.customer_email}</p></div><div className="text-right"><p className="font-display text-2xl font-bold">{money(selected.total)}</p><Badge className="mt-2">{selected.payment_status}</Badge>{selected.payment_method && <p className="mt-2 text-xs font-bold text-muted-foreground">{selected.payment_method}</p>}</div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-secondary/30 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fulfillment</p><p className="mt-1 font-bold">{selected.fulfillment}</p>{selected.fulfillment === "Shipping" && <p className="mt-1 text-sm text-muted-foreground">{selected.address1}{selected.address2 ? `, ${selected.address2}` : ""}<br />{selected.city}, {selected.state} {selected.postal_code}</p>}</div>
                <div className="rounded-2xl bg-secondary/30 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order status</p><select value={selected.status} onChange={(event) => void setStatus(event.target.value as OrderStatus)} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
              </div>
            </header>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{selected.payment_method || "Payment method not chosen"}</p><p className="text-sm text-muted-foreground">Status: {selected.payment_status}{selected.payment_submitted_at ? ` • Submitted ${new Date(selected.payment_submitted_at).toLocaleString()}` : ""}</p></div>{selected.payment_status === "Pending" && selected.payment_method !== "Square" && <Badge variant="secondary">Review in Payments tab</Badge>}</div>
              </div>

              <h3 className="mt-6 font-bold">Items</h3>
              <div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">{item.image_url && <img src={item.image_url} alt="" className="size-16 rounded-xl object-cover" />}<div className="min-w-0 flex-1"><p className="font-bold">{item.quantity}× {item.name}</p><p className="text-xs text-muted-foreground">{[item.team, item.option].filter(Boolean).join(" • ")}</p></div><p className="font-bold">{money(item.line_total)}</p></div>)}</div>
              <div className="ml-auto mt-5 max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><strong>{money(selected.subtotal)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><strong>{money(selected.shipping_amount)}</strong></div><div className="flex justify-between border-t border-border pt-2 text-base"><span>Total</span><strong>{money(selected.total)}</strong></div></div>

              {selected.fulfillment === "Shipping" && <div className="mt-6 rounded-2xl border border-border p-4"><div className="flex items-center gap-2"><Truck className="size-5 text-primary" /><h3 className="font-bold">Shipping & Tracking</h3></div>{selected.tracking_code ? <div className="mt-3"><p className="font-bold">{selected.tracking_carrier || "Carrier"} • {selected.tracking_code}</p><p className="mt-1 text-sm text-muted-foreground">{selected.tracking_status || "Label created"}</p><div className="mt-3 flex gap-2">{selected.label_url && <Button variant="soft" asChild><a href={selected.label_url} target="_blank" rel="noreferrer"><Printer /> Print Label <ExternalLink /></a></Button>}</div></div> : selected.easypost_shipment_id && selected.easypost_rate_id ? <div className="mt-3"><p className="text-sm text-muted-foreground">The customer selected a live shipping rate at checkout. Buy the label after payment is confirmed and the package is ready.</p><Button className="mt-4" variant="hero" onClick={() => void buyLabel()} disabled={labelBusy || selected.payment_status !== "Paid"}>{labelBusy ? <Loader2 className="animate-spin" /> : <PackageCheck />} Buy & Print Label</Button>{selected.payment_status !== "Paid" && <p className="mt-2 text-xs text-amber-700">Payment must be marked Paid first.</p>}</div> : <p className="mt-3 text-sm text-muted-foreground">No live carrier rate is attached to this order yet.</p>}</div>}
            </div>
          </>}
        </section>
      </div>
    </div>
  );
}
