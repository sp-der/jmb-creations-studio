import { CheckCircle2, ExternalLink, Loader2, RefreshCcw, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAdminOrderItems, fetchAdminOrders, orderCode, reviewManualPayment, type JmbOrder, type JmbOrderItem } from "@/lib/orders";

export function PaymentReviewManager({ onOpenOrder }: { onOpenOrder?: (orderId: string) => void }) {
  const [orders, setOrders] = useState<JmbOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<JmbOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useMemo(() => orders.filter((order) => order.payment_status === "Pending" && order.payment_method && order.payment_method !== "Square"), [orders]);
  const selected = useMemo(() => pending.find((order) => order.id === selectedId) ?? pending[0] ?? null, [pending, selectedId]);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await fetchAdminOrders();
      setOrders(rows);
      const nextPending = rows.filter((order) => order.payment_status === "Pending" && order.payment_method && order.payment_method !== "Square");
      setSelectedId((current) => nextPending.some((order) => order.id === current) ? current : (nextPending[0]?.id ?? null));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load payments."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!selected?.id) { setItems([]); return; }
    fetchAdminOrderItems(selected.id).then(setItems).catch(() => setItems([]));
  }, [selected?.id]);

  async function review(approved: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await reviewManualPayment(selected.id, approved);
      toast.success(approved ? "Payment verified" : "Payment returned to Unpaid", { description: approved && result.emailSent === false ? "Order updated, but the customer email could not be sent." : undefined });
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not review payment."); }
    finally { setBusy(false); }
  }

  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Manual verification</p><h1 className="mt-1 text-3xl font-bold">Payments</h1><p className="mt-2 text-sm text-muted-foreground">Only Zelle, PayPal and Venmo orders waiting for JMB verification appear here. Square payments confirm automatically.</p></div><Button variant="soft" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Refresh</Button></div>
    {pending.length === 0 ? <section className="rounded-[1.75rem] border border-border bg-card p-10 text-center shadow-soft"><CheckCircle2 className="mx-auto size-9 text-primary" /><h2 className="mt-3 text-xl font-bold">Nothing waiting for verification</h2><p className="mt-2 text-sm text-muted-foreground">New manual payments will appear here after a customer presses Payment Sent.</p></section> : <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft"><div className="flex items-center justify-between px-2"><h2 className="font-bold">Needs Review</h2><Badge variant="secondary">{pending.length}</Badge></div><div className="mt-3 space-y-2">{pending.map((order) => <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === order.id ? "border-primary bg-secondary/35" : "border-border"}`}><div className="flex justify-between gap-3"><div><strong className="text-primary">{orderCode(order)}</strong><p className="mt-1 text-sm font-bold">{order.first_name} {order.last_name}</p><p className="mt-1 text-xs text-muted-foreground">{order.payment_method}</p></div><strong>{money(order.total)}</strong></div></button>)}</div></aside>
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">{selected && <><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{orderCode(selected)}</p><h2 className="mt-1 text-2xl font-bold">{selected.first_name} {selected.last_name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.customer_email}</p></div><div className="text-right"><p className="font-display text-2xl font-bold">{money(selected.total)}</p><Badge className="mt-2">{selected.payment_method}</Badge></div></div>
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950"><strong>Verify before approving.</strong> Check JMB's {selected.payment_method} activity for the exact total. The customer is instructed to include their name or <strong>{orderCode(selected)}</strong> in the payment note.</div>
        <h3 className="mt-6 font-bold">Order items</h3><div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">{item.image_url && <img src={item.image_url} alt="" className="size-14 rounded-xl object-cover" />}<div className="min-w-0 flex-1"><p className="font-bold">{item.quantity}× {item.name}</p><p className="text-xs text-muted-foreground">{[item.team,item.option].filter(Boolean).join(" • ")}</p></div><strong>{money(item.line_total)}</strong></div>)}</div>
        <div className="mt-6 flex flex-wrap gap-2"><Button variant="hero" disabled={busy} onClick={() => void review(true)}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Verify & Mark Paid</Button><Button variant="soft" disabled={busy} onClick={() => void review(false)}><RotateCcw /> Payment Not Found</Button>{onOpenOrder && <Button variant="ghost" onClick={() => onOpenOrder(selected.id)}>Open Full Order <ExternalLink /></Button>}</div>
      </>}</section>
    </div>}
  </div>;
}
