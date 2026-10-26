import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderConversation } from "@/components/orders/OrderConversation";
import { fetchAdminOrders, orderCode, type JmbOrder } from "@/lib/orders";
import { orderCommunication, orderDate } from "@/lib/order-communications";
export function CustomerInbox({ onOpenOrder }: { onOpenOrder: (id: string) => void }) {
  const [orders, setOrders] = useState<JmbOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (document.hidden) return;
      try {
        const [rows, unread] = await Promise.all([
          fetchAdminOrders(),
          orderCommunication<{ counts: Record<string, number> }>("unread", {}, true),
        ]);
        if (active) {
          setOrders(rows);
          setCounts(unread.counts);
          setSelected(
            (id) => id ?? rows.find((o) => unread.counts[o.id])?.id ?? rows[0]?.id ?? null,
          );
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load inbox.");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  const order = orders.find((o) => o.id === selected);
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="max-h-[720px] space-y-2 overflow-auto rounded-3xl border border-border bg-card p-4">
          {!orders.length && <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>}
          {[...orders]
            .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
            .map((o) => (
              <button
                key={o.id}
                className={`w-full rounded-2xl border p-4 text-left ${selected === o.id ? "border-primary bg-secondary/30" : "border-border"}`}
                onClick={() => setSelected(o.id)}
              >
                <p className="font-bold text-primary">
                  {orderCode(o)}{" "}
                  {Boolean(counts[o.id]) && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-1 text-xs text-white">
                      {counts[o.id]} unread
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {o.first_name} {o.last_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.payment_status} · {orderDate(o.created_at)}
                </p>
              </button>
            ))}
        </aside>
        <section className="min-w-0">
          {order ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold">
                  {orderCode(order)} · {order.first_name} {order.last_name}
                </h2>
                <Button variant="soft" onClick={() => onOpenOrder(order.id)}>
                  Open Order
                </Button>
              </div>
              <OrderConversation
                key={order.id}
                orderId={order.id}
                admin
                onRead={() => setCounts((c) => ({ ...c, [order.id]: 0 }))}
              />
            </>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Choose an order conversation.</p>
          )}
        </section>
      </div>
    </div>
  );
}
