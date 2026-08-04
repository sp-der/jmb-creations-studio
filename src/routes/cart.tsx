import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Home,
  LockKeyhole,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProductPlaceholder } from "@/components/brand/ProductPlaceholder";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PICKUP_LOCATION, PRODUCTS } from "@/data/catalog";
import { PICKUP_DEMO_ID, SHIPPING_DEMO_ID } from "@/data/presentation";
import { formatPrice, useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Checkout Demo | JMB 2 Creations" },
      {
        name: "description",
        content: "Presentation checkout demonstrating shipping and local pickup orders.",
      },
    ],
  }),
  component: CartCheckout,
});

function CartCheckout() {
  const {
    items,
    subtotal,
    discount,
    promo,
    applyPromo,
    updateQuantity,
    removeItem,
    addItem,
    fulfillment,
    setFulfillment,
  } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const didSeedDemoCart = useRef(false);

  useEffect(() => {
    if (didSeedDemoCart.current || items.length > 0) return;
    didSeedDemoCart.current = true;
    const charm = PRODUCTS.find((product) => product.id === "p-001");
    const topper = PRODUCTS.find((product) => product.id === "p-002");
    if (charm) {
      addItem({
        productId: charm.id,
        name: charm.name,
        slug: charm.slug,
        category: charm.category,
        price: charm.price,
        quantity: 2,
        color: "Lavender",
        option: "Lobster clip",
        personalization: "Avery",
      });
    }
    if (topper) {
      addItem({
        productId: topper.id,
        name: topper.name,
        slug: topper.slug,
        category: topper.category,
        price: topper.price,
        quantity: 1,
        color: "Blush Pink",
        option: "Heart",
        personalization: "Avery",
      });
    }
  }, [addItem, items.length]);

  const shipping = fulfillment === "shipping" ? 7.5 : 0;
  const taxable = Math.max(0, subtotal - discount) + shipping;
  const tax = taxable * 0.0775;
  const total = taxable + tax;
  const destinationOrder = fulfillment === "shipping" ? SHIPPING_DEMO_ID : PICKUP_DEMO_ID;

  const summaryRows = useMemo(
    () => [
      ["Subtotal", formatPrice(subtotal)],
      ...(discount > 0 ? [[`Discount${promo ? ` (${promo})` : ""}`, `-${formatPrice(discount)}`]] : []),
      [fulfillment === "shipping" ? "Shipping" : "Local pickup", shipping ? formatPrice(shipping) : "Free"],
      ["Estimated tax", formatPrice(tax)],
    ],
    [discount, fulfillment, promo, shipping, subtotal, tax],
  );

  const applyCode = () => {
    const result = applyPromo(promoInput);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Presentation checkout"
        title="Your Creation Cart"
        subtitle="Switch between shipping and local pickup to demonstrate both order experiences. No payment is processed in this mockup."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-secondary/40 px-4 py-3 text-sm">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
          <p>
            <strong>Presentation only:</strong> checkout controls are interactive, but cards are not charged and orders are demo records.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Cart items</p>
                  <h2 className="mt-1 text-2xl font-bold">Ready to Create</h2>
                </div>
                <ShoppingBag className="size-6 text-primary" aria-hidden />
              </div>

              <div className="mt-5 space-y-4">
                {items.map((item, index) => (
                  <article key={item.id} className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center">
                    <ProductPlaceholder label={item.name} seed={index} className="aspect-square w-full" compact />
                    <div className="min-w-0">
                      <p className="font-bold">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.category}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[item.color, item.option, item.personalization].filter(Boolean).join(" • ")}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="soft"
                          size="icon-sm"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="soft"
                          size="icon-sm"
                          aria-label={`Increase ${item.name} quantity`}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <p className="font-display text-xl font-bold">{formatPrice(item.price * item.quantity)}</p>
                  </article>
                ))}

                {items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="font-bold">Your demo cart is empty</p>
                    <p className="mt-2 text-sm text-muted-foreground">Add a creation from the shop to continue.</p>
                    <Button variant="hero" className="mt-4" asChild>
                      <Link to="/shop">Browse Creations</Link>
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Fulfillment</p>
              <h2 className="mt-1 text-2xl font-bold">How should we get it to you?</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFulfillment("shipping")}
                  className={cn(
                    "rounded-[1.5rem] border p-5 text-left transition-all",
                    fulfillment === "shipping"
                      ? "border-primary bg-secondary/50 ring-2 ring-primary/15"
                      : "border-border hover:bg-secondary/25",
                  )}
                >
                  <Truck className="size-6 text-primary" aria-hidden />
                  <p className="mt-4 text-lg font-bold">Ship My Order</p>
                  <p className="mt-1 text-sm text-muted-foreground">Flat-rate delivery across the US.</p>
                  <p className="mt-3 text-sm font-bold">$7.50 demo shipping</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillment("pickup")}
                  className={cn(
                    "rounded-[1.5rem] border p-5 text-left transition-all",
                    fulfillment === "pickup"
                      ? "border-primary bg-secondary/50 ring-2 ring-primary/15"
                      : "border-border hover:bg-secondary/25",
                  )}
                >
                  <Home className="size-6 text-primary" aria-hidden />
                  <p className="mt-4 text-lg font-bold">Local Pickup</p>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a pickup window after production.</p>
                  <p className="mt-3 text-sm font-bold text-primary">Free</p>
                </button>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3">
                {fulfillment === "shipping" ? <Truck className="size-6 text-primary" /> : <MapPin className="size-6 text-primary" />}
                <h2 className="text-2xl font-bold">
                  {fulfillment === "shipping" ? "Shipping Details" : "Pickup Details"}
                </h2>
              </div>

              {fulfillment === "shipping" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="checkout-name">Full name</Label>
                    <Input id="checkout-name" defaultValue="Jordan M." className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="checkout-email">Email</Label>
                    <Input id="checkout-email" type="email" defaultValue="jordan.demo@example.com" className="mt-2" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="checkout-address">Street address</Label>
                    <Input id="checkout-address" defaultValue="742 Sample Ave" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="checkout-city">City</Label>
                    <Input id="checkout-city" defaultValue="Demo City" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="checkout-state">State & ZIP</Label>
                    <Input id="checkout-state" defaultValue="ST 00000" className="mt-2" />
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-secondary/40 p-4">
                    <p className="flex items-center gap-2 font-bold">
                      <MapPin className="size-4 text-primary" aria-hidden /> {PICKUP_LOCATION.name}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{PICKUP_LOCATION.address}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{PICKUP_LOCATION.note}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="pickup-date">Preferred date</Label>
                      <select id="pickup-date" defaultValue="2026-08-08" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                        <option value="2026-08-08">Saturday, August 8</option>
                        <option value="2026-08-09">Sunday, August 9</option>
                        <option value="2026-08-12">Wednesday, August 12</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="pickup-time">Preferred time</Label>
                      <select id="pickup-time" defaultValue="1-3" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                        <option value="10-12">10:00 AM – 12:00 PM</option>
                        <option value="1-3">1:00 PM – 3:00 PM</option>
                        <option value="4-6">4:00 PM – 6:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
                    <input type="checkbox" defaultChecked className="mt-1 size-4 accent-[var(--color-primary)]" />
                    <span>I understand I must wait until my order is marked Ready for Pickup before arriving.</span>
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3">
                <CreditCard className="size-6 text-primary" aria-hidden />
                <h2 className="text-2xl font-bold">Payment Preview</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="demo-card">Card number</Label>
                  <Input id="demo-card" value="4242 4242 4242 4242" readOnly className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="demo-exp">Expiration</Label>
                  <Input id="demo-exp" value="12 / 30" readOnly className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="demo-cvc">CVC</Label>
                  <Input id="demo-cvc" value="123" readOnly className="mt-2" />
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" aria-hidden /> Stripe will replace this visual mockup during production setup.
              </p>
            </section>
          </div>

          <aside className="sticky top-28 rounded-[1.75rem] border border-border bg-card p-5 shadow-lift sm:p-6">
            <div className="flex items-center gap-3">
              <PackageCheck className="size-6 text-primary" aria-hidden />
              <h2 className="text-2xl font-bold">Order Summary</h2>
            </div>

            <div className="mt-5 space-y-3 border-b border-border pb-5">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between gap-4 py-5">
              <div>
                <p className="text-sm text-muted-foreground">Demo total</p>
                <p className="mt-1 font-display text-3xl font-bold">{formatPrice(total)}</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                {fulfillment === "shipping" ? "Shipping" : "Pickup"}
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder="Promo code"
                aria-label="Promo code"
              />
              <Button type="button" variant="soft" onClick={applyCode}>Apply</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Try WELCOME10 or MAKER15.</p>

            <Button variant="hero" size="lg" className="mt-6 w-full" asChild disabled={items.length === 0}>
              <Link to="/orders/$orderId" params={{ orderId: destinationOrder }}>
                Place Demo Order <ArrowRight aria-hidden />
              </Link>
            </Button>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-secondary/30 p-3">
                <CheckCircle2 className="mx-auto size-4 text-primary" aria-hidden />
                <p className="mt-2 text-[10px] font-bold">Order email</p>
              </div>
              <div className="rounded-2xl bg-secondary/30 p-3">
                <CalendarDays className="mx-auto size-4 text-primary" aria-hidden />
                <p className="mt-2 text-[10px] font-bold">Status updates</p>
              </div>
              <div className="rounded-2xl bg-secondary/30 p-3">
                <PackageCheck className="mx-auto size-4 text-primary" aria-hidden />
                <p className="mt-2 text-[10px] font-bold">Order portal</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}
