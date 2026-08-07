import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileImage,
  Home,
  Mail,
  MapPin,
  MessageCircleMore,
  Package,
  PackageCheck,
  Phone,
  Printer,
  Sparkles,
  Truck,
} from "lucide-react";

import { OrderStatusTimeline } from "@/components/presentation/OrderStatusTimeline";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDERS } from "@/data/orders";
import { CUSTOM_DEMO_ID, CUSTOM_DEMO_ORDER } from "@/data/presentation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.orderId} | JMB 2 Creations Order Demo` },
      {
        name: "description",
        content: "Presentation order detail and status tracking for JMB 2 Creations.",
      },
    ],
  }),
  component: OrderDetailPage,
});

function statusClass(status: string) {
  if (["Completed", "Ready for Pickup"].includes(status)) {
    return "border-transparent bg-emerald-100 text-emerald-800";
  }
  if (["Shipped", "In Production"].includes(status)) {
    return "border-transparent bg-violet-100 text-violet-800";
  }
  if (status === "Cancelled") {
    return "border-transparent bg-rose-100 text-rose-800";
  }
  return "border-transparent bg-amber-100 text-amber-800";
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const order = [...ORDERS, CUSTOM_DEMO_ORDER].find((item) => item.id === orderId);

  if (!order) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <Package className="mx-auto size-12 text-primary" aria-hidden />
          <h1 className="mt-5 text-3xl font-bold">Demo order not found</h1>
          <p className="mt-3 text-muted-foreground">
            Choose one of the presentation orders from the customer portal.
          </p>
          <Button variant="hero" className="mt-6" asChild>
            <Link to="/account">Open Customer Portal</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const itemSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = order.fulfillment === "Shipping" ? 7.5 : 0;
  const difference = Math.max(0, order.total - itemSubtotal - shipping);
  const isCustom = order.id === CUSTOM_DEMO_ID;

  return (
    <StoreLayout>
      <section className="border-b border-border bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <Button variant="soft" size="sm" asChild>
            <Link to="/account">
              <ArrowLeft aria-hidden /> Back to Customer Portal
            </Link>
          </Button>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Order tracking</p>
                <Badge className={cn("rounded-full", statusClass(order.status))}>{order.status}</Badge>
              </div>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{order.id}</h1>
              <p className="mt-3 text-muted-foreground">
                Placed {order.date} • {order.fulfillment}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card px-5 py-4 text-right shadow-soft">
              <p className="text-sm text-muted-foreground">Order total</p>
              <p className="mt-1 font-display text-3xl font-bold">${order.total.toFixed(2)}</p>
              <p className="mt-1 text-xs font-bold text-primary">{order.payment}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section>
          <div className="flex items-center gap-3">
            <Clock3 className="size-6 text-primary" aria-hidden />
            <div>
              <h2 className="text-2xl font-bold">Order Progress</h2>
              <p className="mt-1 text-sm text-muted-foreground">Every status change will eventually trigger a customer email.</p>
            </div>
          </div>
          <div className="mt-5">
            <OrderStatusTimeline order={order} />
          </div>
        </section>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Items</p>
                  <h2 className="mt-1 text-2xl font-bold">What We're Making</h2>
                </div>
                <PackageCheck className="size-7 text-primary" aria-hidden />
              </div>

              <div className="mt-5 space-y-4">
                {order.items.map((item, index) => (
                  <article key={`${item.name}-${index}`} className="rounded-2xl border border-border p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold">{item.quantity}× {item.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.color && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{item.color}</span>}
                          {item.option && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{item.option}</span>}
                          {item.personalization && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{item.personalization}</span>}
                        </div>
                      </div>
                      <p className="font-display text-xl font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </article>
                ))}
              </div>

              {order.referenceImages > 0 && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-secondary/40 p-4">
                  <FileImage className="size-5 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-bold">{order.referenceImages} reference image(s)</p>
                    <p className="text-xs text-muted-foreground">Secure image viewing will be connected in production.</p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3">
                {order.fulfillment === "Shipping" ? <Truck className="size-6 text-primary" /> : <Home className="size-6 text-primary" />}
                <h2 className="text-2xl font-bold">{order.fulfillment} Details</h2>
              </div>

              {order.fulfillment === "Shipping" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-secondary/35 p-4 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ship to</p>
                    <p className="mt-2 font-bold">{order.address}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tracking</p>
                    <p className="mt-2 break-all text-sm font-bold">{order.tracking ?? "Added after shipment"}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Carrier status</p>
                    <p className="mt-2 text-sm font-bold">{order.status === "Shipped" ? "In transit" : "Label pending"}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pickup date</p>
                    <p className="mt-2 font-bold">{order.pickupDate ?? "To be scheduled"}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time window</p>
                    <p className="mt-2 font-bold">{order.pickupWindow ?? "To be scheduled"}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-4 sm:col-span-2">
                    <p className="flex items-center gap-2 font-bold">
                      <MapPin className="size-4 text-primary" aria-hidden /> Pickup location protected
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The exact address and arrival instructions appear once the order is marked Ready for Pickup.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <h2 className="text-2xl font-bold">Status History</h2>
              <ol className="mt-5 space-y-4">
                {order.history.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className="flex gap-4">
                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                      <CheckCircle2 className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 border-b border-border pb-4 last:border-b-0">
                      <p className="font-bold">{entry.status}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.at} • {entry.by}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <CreditCard className="size-5 text-primary" aria-hidden />
                <h2 className="text-xl font-bold">Payment Summary</h2>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Items</dt>
                  <dd className="font-semibold">${itemSubtotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{order.fulfillment === "Shipping" ? "Shipping" : "Pickup"}</dt>
                  <dd className="font-semibold">{shipping ? `$${shipping.toFixed(2)}` : "Free"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tax / adjustments</dt>
                  <dd className="font-semibold">${difference.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-4 text-base">
                  <dt className="font-bold">Total</dt>
                  <dd className="font-display text-xl font-bold">${order.total.toFixed(2)}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-primary" aria-hidden /> Payment status: {order.payment}
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
              <h2 className="text-xl font-bold">Customer Contact</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex items-center gap-3"><Mail className="size-4 text-primary" /> {order.email}</p>
                <p className="flex items-center gap-3"><Phone className="size-4 text-primary" /> {order.phone}</p>
              </div>
            </section>

            {order.customerNote && (
              <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
                <h2 className="text-lg font-bold">Order Note</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{order.customerNote}</p>
              </section>
            )}

            {isCustom && (
              <section className="rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-secondary/70 to-card p-5 shadow-soft">
                <Sparkles className="size-6 text-primary" aria-hidden />
                <h2 className="mt-4 text-xl font-bold">Created from a Custom Chat</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Return to the conversation to confirm details or see the original quote.
                </p>
                <Button variant="hero" className="mt-4 w-full" asChild>
                  <Link to="/custom-orders">
                    <MessageCircleMore aria-hidden /> Open Custom Chat
                  </Link>
                </Button>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="soft" onClick={() => window.print()}>
                <Printer aria-hidden /> Print
              </Button>
              <Button variant="soft" asChild>
                <Link to="/contact">Get Help</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}
