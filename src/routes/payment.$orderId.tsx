import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getValidCustomerSession } from "@/lib/customer-auth";
import { fetchCustomerOrder, fetchGuestOrder, orderCode, type JmbOrder } from "@/lib/orders";
import {
  getRememberedGuestPaymentToken,
  rememberGuestPaymentToken,
  startSquareCheckout,
} from "@/lib/payments";
import { useCart } from "@/lib/cart";
import { orderDate } from "@/lib/order-communications";
export const Route = createFileRoute("/payment/$orderId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: PaymentPage,
});
function PaymentPage() {
  const { orderId } = Route.useParams();
  const { items, clearCart } = useCart();
  const [order, setOrder] = useState<JmbOrder | null>(null);
  const [guestToken, setGuestToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let inFlight = false;
    setOrder(null);
    setLoading(true);
    setError("");
    async function load() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const token =
          new URLSearchParams(window.location.search).get("token") ||
          getRememberedGuestPaymentToken(orderId);
        const session = await getValidCustomerSession().catch(() => null);
        // A guest link still works when the browser happens to be signed in to another account.
        const next = token
          ? await fetchGuestOrder(orderId, token)
          : session
            ? await fetchCustomerOrder(orderId)
            : null;
        if (!active) return;
        if (token) rememberGuestPaymentToken(orderId, token);
        setGuestToken(token);
        setOrder(next);
        setError("");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load checkout.");
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderId]);
  useEffect(() => {
    if (order?.payment_status !== "Paid") return;
    const saved = sessionStorage.getItem("jmb-pending-checkout");
    try {
      const pending = saved ? JSON.parse(saved) : null;
      if (pending?.id === orderId) {
        if (pending.cart === JSON.stringify(items)) clearCart();
        sessionStorage.removeItem("jmb-pending-checkout");
        sessionStorage.removeItem("jmb-checkout-attempt");
      }
    } catch {
      /* Corrupt recovery data does not affect payment status. */
    }
  }, [order?.payment_status, orderId, items, clearCart]);
  async function pay() {
    if (!order || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await startSquareCheckout(order.id, guestToken || undefined);
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open Square.");
      setBusy(false);
    }
  }
  const money = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));
  if (loading)
    return (
      <main className="grid min-h-[70vh] place-items-center">
        <Loader2 className="animate-spin text-primary" />
      </main>
    );
  if (!order)
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldCheck className="mx-auto text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Private checkout unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error ||
            "Open your private link in the same browser, or sign in to the account that owns this order."}
        </p>
        <Button className="mt-6" asChild>
          <Link to="/account">Customer Account</Link>
        </Button>
      </main>
    );
  const paid = order.payment_status === "Paid";
  const closed = order.status === "Cancelled" || order.payment_status === "Refunded";
  const portal = guestToken
    ? `/guest/order/${order.id}?token=${encodeURIComponent(guestToken)}`
    : `/orders/${order.id}`;
  return (
    <main className="min-h-[75vh] bg-[linear-gradient(135deg,#fff8fb,#faf2fb,#f0efff)] px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {orderCode(order)}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          {paid ? "Payment confirmed" : closed ? "Checkout closed" : "Complete Secure Payment"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.first_name} {order.last_name} · {orderDate(order.created_at)}
        </p>
        <div className="mt-6 space-y-3 rounded-2xl bg-secondary/25 p-5">
          <div className="flex justify-between">
            <span>Merchandise</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div className="flex justify-between">
            <span>{order.fulfillment === "Local Pickup" ? "Local Pickup" : "Shipping"}</span>
            <strong>{money(order.shipping_amount)}</strong>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-xl">
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </div>
        </div>
        {paid ? (
          <div className="mt-6 space-y-3">
            <CheckCircle2 className="text-emerald-600" />
            <p>Square has verified your payment. JMB can now prepare your order.</p>
            <Button variant="hero" asChild>
              <a href={portal}>View Order & Conversation</a>
            </Button>
          </div>
        ) : closed ? (
          <p className="mt-6 text-sm">
            This checkout cannot accept another payment. Contact JMB through your order conversation
            for help.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Your checkout is pending. Your order is confirmed only after Square verifies payment.
              Local pickup has no shipping fee; merchandise still requires payment.
            </p>
            {order.payment_status === "Pending" && order.payment_method !== "Square" && (
              <p className="rounded-xl bg-secondary/30 p-4 text-sm">
                A previous manual payment is awaiting JMB review. Do not pay again if you already
                sent it.
              </p>
            )}
            <Button
              variant="hero"
              disabled={
                busy || (order.payment_status === "Pending" && order.payment_method !== "Square")
              }
              onClick={() => void pay()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <CreditCard />}{" "}
              {busy ? "Opening Square…" : `Pay ${money(order.total)} with Square`}
            </Button>
            <p className="text-xs text-muted-foreground">
              If you returned from Square, allow a moment for verification. Returning to this page
              alone does not confirm payment.
            </p>
            <Button variant="soft" onClick={() => window.location.reload()}>
              <RefreshCcw /> Refresh Payment Status
            </Button>
            <p>
              <a href={portal} className="text-sm font-bold text-primary underline">
                Order Conversation & Help
              </a>
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
