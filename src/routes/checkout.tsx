import { Link, createFileRoute } from "@tanstack/react-router";
import { CreditCard, Loader2, MapPin, PackageCheck, Truck, UserPlus, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, useCart } from "@/lib/cart";
import {
  customerSignUp,
  getValidCustomerSession,
  isCustomerAuthConfigured,
  type CustomerSession,
} from "@/lib/customer-auth";
import { createOrder, fetchShippingRates, type FulfillmentMethod, type ShippingAddress, type ShippingRate } from "@/lib/orders";
import { rememberGuestPaymentToken } from "@/lib/payments";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("Shipping");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [rememberAccount, setRememberAccount] = useState(true);
  const [accountBusy, setAccountBusy] = useState(false);
  const selectedRate = rates.find((rate) => rate.id === selectedRateId) ?? null;

  useEffect(() => {
    getValidCustomerSession()
      .then((next) => {
        setSession(next);
        if (next?.user) {
          setEmail(next.user.email ?? "");
          const meta = next.user.user_metadata ?? {};
          if (typeof meta.first_name === "string") setFirstName(meta.first_name);
          if (typeof meta.last_name === "string") setLastName(meta.last_name);
        }
      })
      .catch(() => setSession(null));
  }, []);

  const address = (): ShippingAddress => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    address1: address1.trim(),
    address2: address2.trim(),
    city: city.trim(),
    state: state.trim(),
    postalCode: postalCode.trim(),
    country: "US",
  });

  async function getRates() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !address1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      return toast.error("Complete the shipping address first.");
    }
    setLoadingRates(true);
    try {
      const next = await fetchShippingRates(address(), items);
      setRates(next);
      setSelectedRateId(next[0]?.id ?? "");
      if (!next.length) toast.error("No shipping rates were returned.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not calculate shipping.");
    } finally {
      setLoadingRates(false);
    }
  }

  async function createAccountHere() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return toast.error("Enter your name and email first.");
    if (accountPassword.length < 6) return toast.error("Password must be at least 6 characters.");
    if (accountPassword !== accountConfirm) return toast.error("Passwords do not match.");
    setAccountBusy(true);
    try {
      const result = await customerSignUp(email.trim(), accountPassword, rememberAccount, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      if (result.access_token) {
        setSession(result);
        setShowAccount(false);
        toast.success("Account created", { description: "This order will now be attached to your JMB account." });
      } else {
        toast.success("Account created", { description: "Check your email to confirm the account. You can still finish this checkout as a guest right now." });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function place(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return toast.error("First name, last name and email are required.");
    if (fulfillment === "Shipping" && !selectedRate) return toast.error("Calculate and choose a shipping option.");
    setPlacing(true);
    try {
      const result = await createOrder({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        fulfillment,
        address: fulfillment === "Shipping" ? address() : undefined,
        items,
        shipmentId: selectedRate?.shipmentId,
        rateId: selectedRate?.id,
      });
      rememberGuestPaymentToken(result.order.id, result.guestToken);
      clearCart();
      toast.success("Order created", { description: "Choose how you want to pay on the next screen." });
      const paymentUrl = result.guestToken
        ? `/payment/${result.order.id}?token=${encodeURIComponent(result.guestToken)}`
        : `/payment/${result.order.id}`;
      window.location.assign(paymentUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create order.");
    } finally {
      setPlacing(false);
    }
  }

  if (!items.length) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <PackageCheck className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold">Nothing to check out yet.</h1>
        <Button variant="hero" className="mt-6" asChild><Link to="/shop">Shop Products</Link></Button>
      </main>
    );
  }

  const shipping = selectedRate?.rate ?? 0;
  const total = subtotal + shipping;

  return (
    <main className="min-h-[75vh] bg-[oklch(0.985_0.01_320)] px-4 py-10 sm:px-6">
      <form onSubmit={place} className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Checkout</p>
            <h1 className="mt-2 font-display text-4xl font-bold">Complete Your Order</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {session ? "You are signed in. This order will appear in your account." : "Checking out as a guest. We will email a private order-status link to you."}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><UserRound className="text-primary" /><h2 className="text-xl font-bold">Customer</h2></div>
              {!session && (
                <Button type="button" variant="soft" size="sm" onClick={() => setShowAccount((value) => !value)}>
                  <UserPlus /> {showAccount ? "Hide Account Setup" : "Create Account"}
                </Button>
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">First name<Input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2" autoComplete="given-name" /></label>
              <label className="text-sm font-bold">Last name<Input required value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2" autoComplete="family-name" /></label>
              <label className="text-sm font-bold sm:col-span-2">Email<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2" autoComplete="email" readOnly={Boolean(session)} /></label>
            </div>
            {!session && !showAccount && <p className="mt-4 text-xs text-muted-foreground">No account required. Your secure order page will be sent to this email address.</p>}
            {!session && showAccount && (
              <div className="mt-5 rounded-2xl border border-primary/20 bg-secondary/25 p-4">
                <p className="font-bold">Create your account without leaving checkout</p>
                <p className="mt-1 text-xs text-muted-foreground">Your cart stays right here. After signup, future orders and custom chats can live in one customer portal.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold">Password<Input type="password" minLength={6} value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} className="mt-2" /></label>
                  <label className="text-sm font-bold">Confirm password<Input type="password" minLength={6} value={accountConfirm} onChange={(event) => setAccountConfirm(event.target.value)} className="mt-2" /></label>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={rememberAccount} onChange={(event) => setRememberAccount(event.target.checked)} className="size-4 accent-[var(--primary)]" /> Remember me on this device</label>
                <Button type="button" variant="hero" className="mt-4" disabled={accountBusy || !isCustomerAuthConfigured()} onClick={() => void createAccountHere()}>
                  {accountBusy ? <Loader2 className="animate-spin" /> : <UserPlus />} {accountBusy ? "Creating..." : "Create Account"}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl font-bold">Fulfillment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setFulfillment("Shipping")} className={`rounded-2xl border p-4 text-left ${fulfillment === "Shipping" ? "border-primary bg-secondary/30" : "border-border"}`}>
                <Truck className="size-5 text-primary" /><strong className="mt-2 block">Shipping</strong><span className="text-xs text-muted-foreground">Live carrier rates at checkout</span>
              </button>
              <button type="button" onClick={() => { setFulfillment("Local Pickup"); setRates([]); setSelectedRateId(""); }} className={`rounded-2xl border p-4 text-left ${fulfillment === "Local Pickup" ? "border-primary bg-secondary/30" : "border-border"}`}>
                <MapPin className="size-5 text-primary" /><strong className="mt-2 block">Local Pickup</strong><span className="text-xs text-muted-foreground">Pickup details after confirmation</span>
              </button>
            </div>

            {fulfillment === "Shipping" && (
              <div className="mt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold sm:col-span-2">Street address<Input required value={address1} onChange={(event) => { setAddress1(event.target.value); setRates([]); }} className="mt-2" /></label>
                  <label className="text-sm font-bold sm:col-span-2">Apartment / unit<Input value={address2} onChange={(event) => { setAddress2(event.target.value); setRates([]); }} className="mt-2" /></label>
                  <label className="text-sm font-bold">City<Input required value={city} onChange={(event) => { setCity(event.target.value); setRates([]); }} className="mt-2" /></label>
                  <label className="text-sm font-bold">State<Input required value={state} onChange={(event) => { setState(event.target.value); setRates([]); }} className="mt-2" placeholder="CA" /></label>
                  <label className="text-sm font-bold">ZIP code<Input required value={postalCode} onChange={(event) => { setPostalCode(event.target.value); setRates([]); }} className="mt-2" /></label>
                </div>
                <Button type="button" variant="soft" className="mt-4" onClick={() => void getRates()} disabled={loadingRates}>
                  {loadingRates ? <Loader2 className="animate-spin" /> : <Truck />} {loadingRates ? "Getting Rates..." : "Calculate Shipping"}
                </Button>
                {rates.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {rates.map((rate) => (
                      <label key={rate.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${selectedRateId === rate.id ? "border-primary bg-secondary/25" : "border-border"}`}>
                        <span><input type="radio" className="mr-3" checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} /> <strong>{rate.carrier} {rate.service}</strong>{rate.deliveryDays != null && <span className="ml-2 text-xs text-muted-foreground">~{rate.deliveryDays} days</span>}</span>
                        <strong>{formatPrice(rate.rate)}</strong>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-primary/15 bg-secondary/25 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Payment comes next.</strong> After this order is created, choose Square for secure online checkout or Zelle, PayPal, or Venmo for manual payment verification.
          </div>
        </section>

        <aside className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">Order Summary</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.quantity}× {item.name}</p><p className="text-xs text-muted-foreground">{[item.color, item.option].filter(Boolean).join(" • ")}</p></div>
                <strong className="text-sm">{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><strong>{fulfillment === "Local Pickup" ? "Free" : selectedRate ? formatPrice(shipping) : "Calculate"}</strong></div>
            <div className="flex justify-between border-t border-border pt-3 text-lg"><span>Total</span><strong>{formatPrice(total)}</strong></div>
          </div>
          <Button type="submit" variant="hero" className="mt-5 w-full" disabled={placing}>
            {placing ? <Loader2 className="animate-spin" /> : <CreditCard />} {placing ? "Creating Order..." : "Continue to Payment"}
          </Button>
        </aside>
      </form>
    </main>
  );
}
