import { OrderConversation } from "@/components/orders/OrderConversation";
import { OrderCustomerEmail } from "@/components/admin/OrderCustomerEmail";
import { orderCommunication, orderDate } from "@/lib/order-communications";
import {
  ExternalLink,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCcw,
  Truck,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buyOrderLabel,
  cancelPendingCheckout,
  fetchAdminOrderItems,
  fetchAdminOrders,
  orderCode,
  updateAdminOrder,
  type JmbOrder,
  type JmbOrderItem,
  type OrderStatus,
} from "@/lib/orders";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const STATUSES: OrderStatus[] = [
  "Pending Checkout",
  "Order Received",
  "Payment Confirmed",
  "In Production",
  "Ready for Pickup",
  "Shipped",
  "Completed",
  "Cancelled",
];

export function OrderManager({ initialOrderId }: { initialOrderId?: string | null } = {}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newOrders, setNewOrders] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [trashView, setTrashView] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [orders, setOrders] = useState<JmbOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<JmbOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [labelBusy, setLabelBusy] = useState(false);
  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? null,
    [orders, selectedId],
  );

  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    setLoading(true);
    try {
      const rows = await fetchAdminOrders(trashView);
      if (version !== refreshVersion.current) return;
      setOrders(rows);
      const unread = await orderCommunication<{
        counts: Record<string, number>;
        newOrders: string[];
      }>("unread", {}, true);
      if (version !== refreshVersion.current) return;
      setCounts(unread.counts);
      setNewOrders(unread.newOrders);
      setSelectedId((current) =>
        rows.some((order) => order.id === current)
          ? current
          : initialOrderId && rows.some((order) => order.id === initialOrderId)
            ? initialOrderId
            : (rows[0]?.id ?? null),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load orders.");
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, [trashView, initialOrderId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10000);
    return () => {
      window.clearInterval(timer);
      // Invalidate outstanding fetches when switching between Active and Trash.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      refreshVersion.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (initialOrderId) setSelectedId(initialOrderId);
  }, [initialOrderId]);
  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      return;
    }
    fetchAdminOrderItems(selectedId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [selectedId]);

  async function moveOrder(orderId: string, restore: boolean) {
    if (trashBusy) return;
    setTrashBusy(true);
    try {
      await orderCommunication(restore ? "restore" : "delete", { orderId }, true);
      setConfirmId(null);
      setOrders((current) => current.filter((order) => order.id !== orderId));
      setSelectedId(null);
      setCounts((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
      setNewOrders((current) => current.filter((id) => id !== orderId));
      toast.success(
        restore
          ? "Order restored to active orders."
          : "Order moved to Trash. Payments and history are preserved.",
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move order.");
    } finally {
      setTrashBusy(false);
    }
  }

  async function setStatus(status: OrderStatus) {
    if (!selected) return;
    try {
      const updated = await updateAdminOrder(selected.id, { status });
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      toast.success(`${orderCode(updated)} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update order.");
    }
  }

  async function cancelCheckout() {
    if (!selected || cancelBusy) return;
    setCancelBusy(true);
    try {
      const result = await cancelPendingCheckout(selected.id);
      setOrders((current) => current.map((o) => (o.id === result.order.id ? result.order : o)));
      toast.success("Checkout closed and reserved stock released.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel checkout.");
    } finally {
      setCancelBusy(false);
    }
  }

  async function buyLabel() {
    if (!selected) return;
    if (selected.payment_status !== "Paid") {
      toast.error("Confirm payment before purchasing a shipping label.");
      return;
    }
    setLabelBusy(true);
    try {
      const result = await buyOrderLabel(selected.id);
      setOrders((current) =>
        current.map((order) => (order.id === result.order.id ? result.order : order)),
      );
      toast.success("Shipping label purchased", {
        description:
          result.emailSent === false
            ? `Tracking ${result.trackingCode} was saved, but the customer email failed.`
            : `Tracking ${result.trackingCode} was emailed to the customer.`,
      });
      if (result.labelUrl) window.open(result.labelUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not purchase label.");
    } finally {
      setLabelBusy(false);
    }
  }

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      Number(value) || 0,
    );

  return (
    <div className="space-y-6">
      <AlertDialog
        open={Boolean(confirmId)}
        onOpenChange={(open) => {
          if (!open && !trashBusy) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Order{" "}
              {orderCode(orders.find((order) => order.id === confirmId) ?? { order_number: 0 })} for{" "}
              {orders.find((order) => order.id === confirmId)?.first_name}{" "}
              {orders.find((order) => order.id === confirmId)?.last_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This order will be removed from your active dashboard. You can restore it from Trash.
              Payment records and conversation history are preserved. This does not cancel or refund
              a payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={trashBusy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={trashBusy}
              onClick={() => confirmId && void moveOrder(confirmId, false)}
            >
              {trashBusy ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete Order
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Order management
          </p>
          <h1 className="mt-1 text-3xl font-bold">
            {trashView ? "Trash / Deleted Orders" : "Orders"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every storefront order has its own Order Chat. Deleted orders stay recoverable in Trash.
          </p>
        </div>
        <Button variant="soft" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={!trashView ? "default" : "soft"}
          onClick={() => {
            setTrashView(false);
            setSelectedId(null);
          }}
        >
          Active Orders
        </Button>
        <Button
          variant={trashView ? "default" : "soft"}
          onClick={() => {
            setTrashView(true);
            setSelectedId(null);
          }}
        >
          <Trash2 /> Trash
        </Button>
      </div>
      {!trashView && (
        <div className="flex flex-wrap gap-2">
          {[
            ["paid", "Paid Orders"],
            ["pending", "Pending Checkouts"],
            ["all", "All Orders"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={filter === value ? "default" : "soft"}
              onClick={() => setFilter(value!)}
            >
              {label}
            </Button>
          ))}
          <Badge variant="secondary">
            {newOrders.length} new paid orders · {Object.values(counts).reduce((a, b) => a + b, 0)}{" "}
            unread messages
          </Badge>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-bold">{trashView ? "Deleted Orders" : "Active Orders"}</h2>
            <Badge variant="secondary">{orders.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {orders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {trashView ? "Trash is empty." : "No customer orders yet."}
              </p>
            ) : (
              orders
                .filter(
                  (order) =>
                    trashView ||
                    filter === "all" ||
                    (filter === "paid"
                      ? order.payment_status === "Paid"
                      : order.payment_status !== "Paid"),
                )
                .map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    className={`w-full rounded-2xl border p-4 text-left ${selectedId === order.id ? "border-primary/40 bg-secondary/40" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-primary">{orderCode(order)}</p>
                        <p className="mt-1 text-sm font-bold">
                          {order.first_name} {order.last_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {order.fulfillment} • {order.status}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {orderDate(order.created_at)}
                        </p>
                        {order.deleted_at && (
                          <p className="mt-1 text-xs font-bold text-destructive">
                            Deleted {orderDate(order.deleted_at)}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {newOrders.includes(order.id) && <Badge>New paid order</Badge>}
                          {Boolean(counts[order.id]) && (
                            <Badge variant="secondary">{counts[order.id]} unread</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-bold">
                          {order.payment_method || "No payment method"} • {order.payment_status}
                        </p>
                      </div>
                      <p className="font-bold">{money(order.total)}</p>
                    </div>
                  </button>
                ))
            )}
          </div>
        </aside>

        <section className="rounded-[1.75rem] border border-border bg-card shadow-soft">
          {!selected ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Choose an order.</div>
          ) : (
            <>
              <header className="border-b border-border p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                      {orderCode(selected)}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">
                      {selected.first_name} {selected.last_name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <a
                        className="break-all text-primary underline"
                        href={`mailto:${selected.customer_email}`}
                      >
                        {selected.customer_email}
                      </a>
                    </p>
                    <p className="mt-2 text-xs font-bold">
                      {selected.customer_user_id ? "Registered Account" : "Guest Checkout"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Created {orderDate(selected.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Payment confirmed {orderDate(selected.payment_confirmed_at)}
                    </p>
                    {selected.customer_user_id && (
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Account reference: {selected.customer_user_id}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold">{money(selected.total)}</p>
                    <Badge className="mt-2">{selected.payment_status}</Badge>
                    {selected.payment_method && (
                      <p className="mt-2 text-xs font-bold text-muted-foreground">
                        {selected.payment_method}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-secondary/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Fulfillment
                    </p>
                    <p className="mt-1 font-bold">{selected.fulfillment}</p>
                    {selected.fulfillment === "Shipping" && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selected.address1}
                        {selected.address2 ? `, ${selected.address2}` : ""}
                        <br />
                        {selected.city}, {selected.state} {selected.postal_code}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl bg-secondary/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Order status
                    </p>
                    <select
                      disabled={Boolean(selected.deleted_at)}
                      aria-label="Order status"
                      value={selected.status}
                      onChange={(event) => void setStatus(event.target.value as OrderStatus)}
                      className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      {STATUSES.map((status) => (
                        <option
                          key={status}
                          disabled={
                            (selected.checkout_version >= 2 &&
                              status === "Cancelled" &&
                              selected.status !== "Cancelled") ||
                            (selected.payment_status !== "Paid" &&
                              !["Pending Checkout", "Order Received", "Cancelled"].includes(status))
                          }
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </header>

              <div className="p-5 sm:p-6">
                {selected.deleted_at ? (
                  <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <p className="text-sm">
                      Deleted {orderDate(selected.deleted_at)}. Payments, items, and chat history
                      are preserved. No refund was issued.
                    </p>
                    <Button
                      className="mt-3"
                      disabled={trashBusy}
                      onClick={() => void moveOrder(selected.id, true)}
                    >
                      <RotateCcw /> Restore Order
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <a className="font-bold text-primary underline" href="#order-chat">
                      Open Order Chat
                    </a>
                    <Button
                      variant="destructive"
                      disabled={trashBusy}
                      onClick={() => setConfirmId(selected.id)}
                    >
                      <Trash2 /> Delete Order
                    </Button>
                  </div>
                )}
                <div id="order-chat" className="scroll-mt-24">
                  <OrderConversation
                    key={`chat-${selected.id}`}
                    orderId={selected.id}
                    admin
                    readOnly={Boolean(selected.deleted_at)}
                    onRead={() => {
                      if (!selected.deleted_at) {
                        setCounts((current) => ({ ...current, [selected.id]: 0 }));
                        setNewOrders((current) => current.filter((id) => id !== selected.id));
                      }
                    }}
                  />
                </div>

                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Payment
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {selected.payment_method || "Payment method not chosen"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: {selected.payment_status}
                        {selected.payment_submitted_at
                          ? ` • Submitted ${orderDate(selected.payment_submitted_at)}`
                          : ""}
                      </p>
                    </div>
                    {selected.payment_status === "Pending" &&
                      selected.payment_method !== "Square" && (
                        <Badge variant="secondary">Review in Payments tab</Badge>
                      )}
                  </div>
                </div>

                {!selected.deleted_at &&
                  selected.checkout_version >= 2 &&
                  selected.payment_status !== "Paid" &&
                  selected.payment_status !== "Refunded" &&
                  selected.status !== "Cancelled" && (
                    <Button
                      className="mt-4 h-auto whitespace-normal text-left"
                      variant="soft"
                      disabled={cancelBusy}
                      onClick={() => void cancelCheckout()}
                    >
                      {cancelBusy
                        ? "Closing Square Checkout…"
                        : "Cancel Unpaid Checkout & Release Stock"}
                    </Button>
                  )}
                {!selected.deleted_at && (
                  <OrderCustomerEmail
                    key={`email-${selected.id}`}
                    orderId={selected.id}
                    email={selected.customer_email}
                  />
                )}
                <h3 className="mt-6 font-bold">Items</h3>
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-border p-3"
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="size-16 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          {item.quantity}× {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[item.team, item.option].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <p className="font-bold">{money(item.line_total)}</p>
                    </div>
                  ))}
                </div>
                <div className="ml-auto mt-5 max-w-sm space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <strong>{money(selected.subtotal)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <strong>{money(selected.shipping_amount)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base">
                    <span>Total</span>
                    <strong>{money(selected.total)}</strong>
                  </div>
                </div>

                {selected.fulfillment === "Shipping" && (
                  <div className="mt-6 rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Truck className="size-5 text-primary" />
                      <h3 className="font-bold">Shipping & Tracking</h3>
                    </div>
                    {selected.tracking_code ? (
                      <div className="mt-3">
                        <p className="font-bold">
                          {selected.tracking_carrier || "Carrier"} • {selected.tracking_code}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selected.tracking_status || "Label created"}
                        </p>
                        <div className="mt-3 flex gap-2">
                          {selected.label_url && (
                            <Button variant="soft" asChild>
                              <a href={selected.label_url} target="_blank" rel="noreferrer">
                                <Printer /> Print Label <ExternalLink />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : selected.easypost_shipment_id && selected.easypost_rate_id ? (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground">
                          The customer selected a live shipping rate at checkout. Buy the label
                          after payment is confirmed and the package is ready.
                        </p>
                        <Button
                          className="mt-4"
                          variant="hero"
                          onClick={() => void buyLabel()}
                          disabled={
                            Boolean(selected.deleted_at) ||
                            labelBusy ||
                            selected.payment_status !== "Paid"
                          }
                        >
                          {labelBusy ? <Loader2 className="animate-spin" /> : <PackageCheck />} Buy
                          & Print Label
                        </Button>
                        {selected.payment_status !== "Paid" && (
                          <p className="mt-2 text-xs text-amber-700">
                            Payment must be marked Paid first.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No live carrier rate is attached to this order yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
