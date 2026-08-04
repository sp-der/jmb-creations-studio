import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Home,
  MessageCircleMore,
  PackageCheck,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDERS } from "@/data/orders";
import {
  CUSTOM_DEMO_ID,
  CUSTOM_DEMO_ORDER,
  PICKUP_DEMO_ID,
  SHIPPING_DEMO_ID,
} from "@/data/presentation";
import {
  getDemoRequestState,
  subscribePresentation,
  type DemoRequestState,
} from "@/lib/presentation-sync";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Customer Portal Demo | JMB 2 Creations" },
      {
        name: "description",
        content: "Presentation customer portal with shipping, pickup and custom-order examples.",
      },
    ],
  }),
  component: AccountDemo,
});

function badgeClass(status: string) {
  if (["Completed", "Ready for Pickup", "Converted"].includes(status)) {
    return "border-transparent bg-emerald-100 text-emerald-800";
  }
  if (["Shipped", "In Production"].includes(status)) {
    return "border-transparent bg-violet-100 text-violet-800";
  }
  return "border-transparent bg-amber-100 text-amber-800";
}

function AccountDemo() {
  const [request, setRequest] = useState<DemoRequestState>(() => getDemoRequestState());

  useEffect(() => {
    const sync = () => setRequest(getDemoRequestState());
    sync();
    return subscribePresentation(sync);
  }, []);

  const baseOrders = [
    ORDERS.find((order) => order.id === SHIPPING_DEMO_ID),
    ORDERS.find((order) => order.id === PICKUP_DEMO_ID),
  ].filter(Boolean);
  const visibleOrders = request.status === "Converted" ? [CUSTOM_DEMO_ORDER, ...baseOrders] : baseOrders;

  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Presentation customer portal"
        title="Welcome Back, Demo Customer"
        subtitle="Customer accounts will be connected later. For now, this page demonstrates order tracking, pickup details and custom-order conversations."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft">
            <UserRound className="size-6 text-primary" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Demo profile</p>
            <p className="mt-1 text-xl font-bold">Avery R.</p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft">
            <PackageCheck className="size-6 text-primary" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Visible orders</p>
            <p className="mt-1 text-xl font-bold">{visibleOrders.length}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft">
            <MessageCircleMore className="size-6 text-primary" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Custom request</p>
            <p className="mt-1 text-xl font-bold">{request.status}</p>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Presentation orders</p>
                <h2 className="mt-1 text-2xl font-bold">Your Orders</h2>
              </div>
              <Button variant="hero" asChild>
                <Link to="/shop">Shop More Creations</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {visibleOrders.map((order) => {
                if (!order) return null;
                const isShipping = order.fulfillment === "Shipping";
                return (
                  <article key={order.id} className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-xl font-bold text-primary">{order.id}</p>
                          <Badge className={cn("rounded-full", badgeClass(order.status))}>{order.status}</Badge>
                        </div>
                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                          {isShipping ? <Truck className="size-4 text-primary" /> : <Home className="size-4 text-primary" />}
                          {order.fulfillment}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">Placed {order.date}</p>
                      </div>
                      <p className="font-display text-2xl font-bold">${order.total.toFixed(2)}</p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-secondary/35 p-4">
                      <p className="text-sm font-bold">{order.items[0]?.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} total item(s)
                        {isShipping && order.tracking ? ` • Tracking ${order.tracking}` : ""}
                        {!isShipping && order.pickupDate ? ` • Pickup ${order.pickupDate}` : ""}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button variant="hero" asChild>
                        <Link to="/orders/$orderId" params={{ orderId: order.id }}>
                          View Order <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                      {order.id === CUSTOM_DEMO_ID && (
                        <Button variant="soft" asChild>
                          <Link to="/custom-orders">Open Custom Chat</Link>
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
              <Sparkles className="size-6 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">Custom Request</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Continue the pastel space charm conversation, check the quote and see live read and typing indicators.
              </p>
              <div className="mt-4 rounded-2xl bg-secondary/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">REQ-208</p>
                  <Badge className={cn("rounded-full", badgeClass(request.status))}>{request.status}</Badge>
                </div>
                <p className="mt-2 text-sm">12 personalized bag charms</p>
                <p className="mt-1 text-sm font-bold text-primary">Quote ${request.quote.toFixed(2)}</p>
              </div>
              <Button variant="hero" className="mt-4 w-full" asChild>
                <Link to="/custom-orders">Open Conversation</Link>
              </Button>
            </section>

            <section className="rounded-[1.75rem] border border-dashed border-border bg-card p-5">
              <h2 className="text-base font-bold">Production note</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Login, saved addresses, favorites and full customer history will be connected after the client approves the presentation flow.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}
