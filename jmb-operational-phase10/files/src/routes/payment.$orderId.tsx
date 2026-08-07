import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clipboard, CreditCard, Loader2, RefreshCcw, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getValidCustomerSession } from "@/lib/customer-auth";
import { fetchCustomerOrder, fetchGuestOrder, orderCode, type JmbOrder } from "@/lib/orders";
import {
  fetchPaymentSettings,
  getRememberedGuestPaymentToken,
  rememberGuestPaymentToken,
  markManualPaymentSent,
  startSquareCheckout,
  type PaymentMethod,
  type PaymentSetting,
} from "@/lib/payments";

export const Route = createFileRoute("/payment/$orderId")({ component: PaymentPage });

const METHODS: PaymentMethod[] = ["Square", "Zelle", "PayPal", "Venmo"];

function PaymentPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<JmbOrder | null>(null);
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("Square");
  const [guestToken, setGuestToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const selected = useMemo(() => settings.find((setting) => setting.method === method) ?? null, [settings, method]);
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

  async function load() {
    setLoading(true);
    try {
      const currentSession = await getValidCustomerSession().catch(() => null);
      setSignedIn(Boolean(currentSession?.access_token));
      let nextOrder: JmbOrder | null = null;
      let token = "";
      if (currentSession?.access_token) {
        nextOrder = await fetchCustomerOrder(orderId);
      } else {
        const fromQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";
        token = fromQuery || getRememberedGuestPaymentToken(orderId);
        setGuestToken(token);
        if (token) {
          rememberGuestPaymentToken(orderId, token);
          nextOrder = await fetchGuestOrder(orderId, token);
        }
      }
      setOrder(nextOrder);
      const nextSettings = await fetchPaymentSettings();
      setSettings(nextSettings);
      if (!nextSettings.some((setting) => setting.method === method && setting.is_enabled)) {
        setMethod(nextSettings[0]?.method ?? "Square");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load payment page.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [orderId]);

  async function squareCheckout() {
    if (!order) return;
    setBusy(true);
    try {
      const result = await startSquareCheckout(order.id, guestToken || undefined, window.location.origin);
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Square checkout.");
      setBusy(false);
    }
  }

  async function paymentSent() {
    if (!order || method === "Square") return;
    setBusy(true);
    try {
      const result = await markManualPaymentSent(order.id, method, guestToken || undefined);
      setOrder(result.order);
      toast.success("Payment marked as sent", { description: "JMB will verify the payment before production begins." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payment status.");
    } finally {
      setBusy(false);
    }
  }

  async function copyReference() {
    if (!order) return;
    const value = `${order.first_name} ${order.last_name} • ${orderCode(order)}`;
    try { await navigator.clipboard.writeText(value); toast.success("Payment note copied"); }
    catch { toast.info(value); }
  }

  if (loading) return <main className="grid min-h-[70vh] place-items-center bg-[oklch(0.985_0.01_320)]"><Loader2 className="size-7 animate-spin text-primary" /></main>;
  if (!order) return <main className="grid min-h-[70vh] place-items-center bg-[oklch(0.985_0.01_320)] px-4"><section className="max-w-lg text-center"><ShieldCheck className="mx-auto size-9 text-primary" /><h1 className="mt-4 font-display text-3xl font-bold">We could not open this payment page.</h1><p className="mt-3 text-sm text-muted-foreground">We could not verify this private guest order. Return to checkout in the same browser, or open the private order link JMB emailed to you.</p><Button className="mt-6" variant="hero" asChild><Link to="/account">Customer Account</Link></Button></section></main>;

  const enabled = METHODS.filter((candidate) => settings.some((setting) => setting.method === candidate && setting.is_enabled));
  const manualReady = Boolean(selected?.payment_details?.trim());
  const paymentReference = `${order.first_name} ${order.last_name} • ${orderCode(order)}`;

  return (
    <main className="min-h-[78vh] bg-[linear-gradient(135deg,#fff8fb,#faf2fb,#f0efff)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => history.back()}><ArrowLeft /> Back</Button>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Payment</p>
            <h1 className="mt-2 font-display text-4xl font-bold">Choose How to Pay</h1>
            <p className="mt-2 text-sm text-muted-foreground">{orderCode(order)} • {order.first_name} {order.last_name}</p>

            {order.payment_status === "Paid" ? (
              <div className="mt-7 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                <CheckCircle2 className="size-8" />
                <h2 className="mt-3 text-2xl font-bold">Payment confirmed</h2>
                <p className="mt-2 text-sm">JMB has received payment for this order. You can continue tracking it from your order page.</p>
                <Button className="mt-5" variant="hero" asChild>
                  {signedIn ? <Link to="/orders/$orderId" params={{ orderId: order.id }}>View Order</Link> : <a href={`/guest/order/${order.id}?token=${encodeURIComponent(guestToken)}`}>View Order</a>}
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {enabled.map((candidate) => {
                    const setting = settings.find((item) => item.method === candidate)!;
                    return (
                      <button key={candidate} type="button" onClick={() => setMethod(candidate)} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${method === candidate ? "border-primary bg-secondary/35 shadow-soft" : "border-border hover:bg-secondary/15"}`}>
                        {setting.logo_url ? <img src={setting.logo_url} alt={`${setting.display_name} logo`} className="size-10 rounded-xl bg-white object-contain p-1" /> : <WalletCards className="size-8 text-primary" />}
                        <div><p className="font-bold">{setting.display_name}</p><p className="mt-1 text-xs text-muted-foreground">{candidate === "Square" ? "Secure online checkout" : "Manual verification"}</p></div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-border bg-[oklch(0.99_0.006_320)] p-5">
                  <div className="flex items-center gap-4">
                    {selected?.logo_url ? <img src={selected.logo_url} alt={`${selected.display_name} logo`} className="size-14 rounded-2xl bg-white object-contain p-2 shadow-sm" /> : <CreditCard className="size-10 text-primary" />}
                    <div><p className="text-sm text-muted-foreground">Selected payment method</p><h2 className="text-2xl font-bold">{selected?.display_name ?? method}</h2></div>
                  </div>

                  {method === "Square" ? (
                    <div className="mt-5">
                      <p className="text-sm leading-relaxed text-muted-foreground">You will be sent to Square's secure hosted checkout to complete payment. After Square confirms the payment, this order is marked Paid automatically.</p>
                      <Button variant="hero" className="mt-5 w-full sm:w-auto" onClick={() => void squareCheckout()} disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : <CreditCard />} {busy ? "Opening Square..." : `Pay ${money(order.total)} with Square`}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl bg-secondary/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{selected?.detail_label || `${method} payment details`}</p>
                        <p className="mt-2 break-words text-lg font-bold">{selected?.payment_details || "JMB has not configured this payment method yet."}</p>
                        {selected?.instructions && <p className="mt-2 text-sm text-muted-foreground">{selected.instructions}</p>}
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <strong>Important payment note:</strong> include your name or order number in the payment memo so JMB can match it to your order.
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/70 p-3"><code className="flex-1 text-xs font-bold sm:text-sm">{paymentReference}</code><Button type="button" size="sm" variant="soft" onClick={() => void copyReference()}><Clipboard /> Copy</Button></div>
                      </div>
                      <p className="text-sm text-muted-foreground">After sending the full <strong className="text-foreground">{money(order.total)}</strong>, return here and press Payment Sent. JMB will verify it manually before the order moves into production.</p>
                      <Button variant="hero" className="w-full sm:w-auto" onClick={() => void paymentSent()} disabled={busy || !manualReady}>
                        {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {busy ? "Updating..." : "Payment Sent"}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <aside className="rounded-[2rem] border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
            <h2 className="text-xl font-bold">Order Total</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><strong>{money(order.subtotal)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><strong>{money(order.shipping_amount)}</strong></div>
              <div className="flex justify-between border-t border-border pt-3 text-xl"><span>Total</span><strong>{money(order.total)}</strong></div>
            </div>
            <div className="mt-5 rounded-2xl bg-secondary/30 p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment status</p><p className="mt-1 font-bold">{order.payment_status === "Pending" ? "Pending JMB verification" : order.payment_status}</p>{order.payment_method && <p className="mt-1 text-xs text-muted-foreground">Method: {order.payment_method}</p>}</div>
            {order.payment_status === "Pending" && <Button variant="soft" className="mt-4 w-full" onClick={() => void load()}><RefreshCcw /> Refresh Status</Button>}
          </aside>
        </div>
      </div>
    </main>
  );
}
