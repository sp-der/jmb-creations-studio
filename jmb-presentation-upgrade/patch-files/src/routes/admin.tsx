import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  ExternalLink,
  Home,
  Inbox,
  LayoutDashboard,
  MessageCircleMore,
  PackageCheck,
  RefreshCcw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ChatRoom } from "@/components/presentation/ChatRoom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CUSTOM_REQUESTS, ORDERS, ORDER_STATUSES, type Order, type OrderStatus } from "@/data/orders";
import {
  CUSTOM_DEMO_ID,
  CUSTOM_DEMO_ORDER,
  CUSTOM_REQUEST_ID,
  PICKUP_DEMO_ID,
  SHIPPING_DEMO_ID,
} from "@/data/presentation";
import {
  getDemoRequestState,
  resetPresentationDemo,
  saveDemoRequestState,
  subscribePresentation,
  type DemoRequestState,
} from "@/lib/presentation-sync";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard Demo | JMB 2 Creations" },
      {
        name: "description",
        content:
          "Presentation-only admin dashboard for JMB 2 Creations orders, pickup fulfillment and custom-order messages.",
      },
    ],
  }),
  component: AdminDashboard,
});

type AdminSection = "overview" | "orders" | "requests";

const sectionItems = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "orders" as const, label: "Orders", icon: ShoppingBag },
  { id: "requests" as const, label: "Custom Chats", icon: MessageCircleMore },
];

const mockMonthlySales = [42, 56, 48, 70, 64, 82, 93, 74, 100, 88, 112, 126];

function statusClass(status: string) {
  if (["Completed", "Ready for Pickup", "Converted", "Accepted"].includes(status)) {
    return "border-transparent bg-emerald-100 text-emerald-800";
  }
  if (["Shipped", "In Production", "Quoted", "In Review"].includes(status)) {
    return "border-transparent bg-violet-100 text-violet-800";
  }
  if (["Cancelled", "Declined"].includes(status)) {
    return "border-transparent bg-rose-100 text-rose-800";
  }
  return "border-transparent bg-amber-100 text-amber-800";
}

function AdminDashboard() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [request, setRequest] = useState<DemoRequestState>(() => getDemoRequestState());
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState(SHIPPING_DEMO_ID);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(CUSTOM_REQUEST_ID);

  useEffect(() => {
    const sync = () => setRequest(getDemoRequestState());
    sync();
    return subscribePresentation(sync);
  }, []);

  useEffect(() => {
    setOrders((current) => {
      const withoutCustom = current.filter((order) => order.id !== CUSTOM_DEMO_ID);
      return request.status === "Converted" ? [CUSTOM_DEMO_ORDER, ...withoutCustom] : withoutCustom;
    });
  }, [request.status]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const selectedRequest = CUSTOM_REQUESTS.find((item) => item.id === selectedRequestId) ?? CUSTOM_REQUESTS[0];

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      `${order.id} ${order.customer} ${order.fulfillment} ${order.status}`.toLowerCase().includes(query),
    );
  }, [orderSearch, orders]);

  const metrics = [
    {
      label: "New orders",
      value: orders.filter((order) => order.status === "Order Received").length,
      detail: "Needs review",
      icon: Inbox,
    },
    {
      label: "In production",
      value: orders.filter((order) => order.status === "In Production").length,
      detail: "Currently printing",
      icon: Box,
    },
    {
      label: "Pickup ready",
      value: orders.filter((order) => order.status === "Ready for Pickup").length,
      detail: "Awaiting customers",
      icon: PackageCheck,
    },
    {
      label: "Demo sales",
      value: "$2,540",
      detail: "Presentation total",
      icon: DollarSign,
    },
  ];

  const updateOrderStatus = (status: OrderStatus) => {
    if (!selectedOrder) return;
    setOrders((current) =>
      current.map((order) =>
        order.id === selectedOrder.id
          ? {
              ...order,
              status,
              history: [
                ...order.history,
                {
                  status,
                  at: new Date().toLocaleString(),
                  by: "Demo Admin",
                },
              ],
            }
          : order,
      ),
    );
    toast.success(`${selectedOrder.id} updated`, { description: `Status changed to ${status}.` });
  };

  const sendQuote = () => {
    const updated: DemoRequestState = {
      requestId: CUSTOM_REQUEST_ID,
      status: "Quoted",
      quote: request.quote || 126,
    };
    saveDemoRequestState(updated);
    setRequest(updated);
    toast.success("Demo quote sent", { description: "$126 is now visible in the customer chat view." });
  };

  const convertToOrder = () => {
    const updated: DemoRequestState = {
      ...request,
      status: "Converted",
      orderId: CUSTOM_DEMO_ID,
    };
    saveDemoRequestState(updated);
    setRequest(updated);
    setSelectedOrderId(CUSTOM_DEMO_ID);
    toast.success("Custom request converted", { description: `${CUSTOM_DEMO_ID} was added to orders.` });
  };

  const resetDemo = () => {
    resetPresentationDemo();
    setRequest(getDemoRequestState());
    setOrders(ORDERS);
    setSelectedOrderId(SHIPPING_DEMO_ID);
    toast.success("Presentation reset");
  };

  return (
    <div className="min-h-dvh bg-[oklch(0.975_0.012_320)] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-20 items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex h-14 w-28 items-center overflow-hidden" aria-label="Storefront home">
            <img src="/logoheader.png" alt="JMB 2 Creations" className="h-full w-full scale-125 object-contain" />
          </Link>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold">Admin Dashboard</p>
            <p className="text-xs text-muted-foreground">Presentation mode • no login required</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="soft" size="sm" onClick={resetDemo} className="hidden sm:inline-flex">
              <RefreshCcw aria-hidden /> Reset Demo
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/">
                <Store aria-hidden /> Storefront
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-5rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card px-3 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Admin sections">
            {sectionItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors lg:w-full",
                    active
                      ? "bg-gradient-plum text-primary-foreground shadow-soft"
                      : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                  {item.id === "requests" && (
                    <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white/20" : "bg-secondary text-primary")}>
                      1 live
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 hidden rounded-[1.5rem] bg-secondary/40 p-4 lg:block">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <p className="mt-3 text-sm font-bold">Demo shortcuts</p>
            <div className="mt-3 space-y-2 text-xs">
              <Link to="/account" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Users className="size-3.5" /> Customer portal
              </Link>
              <Link to="/cart" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ShoppingBag className="size-3.5" /> Checkout demo
              </Link>
              <Link to="/custom-orders" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <MessageCircleMore className="size-3.5" /> Customer chat
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {section === "overview" && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Tuesday, August 4</p>
                  <h1 className="mt-1 text-3xl font-bold">Good afternoon, JMB team</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Here is the presentation snapshot of orders, pickups and custom conversations.
                  </p>
                </div>
                <Badge className="rounded-full bg-gradient-plum px-4 py-2 text-primary-foreground">
                  Live mockup
                </Badge>
              </div>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard metrics">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
                          <p className="mt-2 font-display text-3xl font-bold">{metric.value}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                        </div>
                        <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                          <Icon className="size-5" aria-hidden />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </section>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">Recent orders</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Shipping, pickup and custom-order examples</p>
                    </div>
                    <Button variant="soft" size="sm" onClick={() => setSection("orders")}>
                      View all
                    </Button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setSection("orders");
                        }}
                        className="grid w-full gap-3 rounded-2xl border border-border px-4 py-4 text-left transition-colors hover:bg-secondary/35 sm:grid-cols-[110px_minmax(0,1fr)_auto_auto] sm:items-center"
                      >
                        <span className="font-bold text-primary">{order.id}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{order.customer}</span>
                          <span className="block text-xs text-muted-foreground">{order.items.length} line item(s)</span>
                        </span>
                        <span className="text-sm font-semibold">${order.total.toFixed(2)}</span>
                        <Badge className={cn("w-fit rounded-full", statusClass(order.status))}>{order.status}</Badge>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-gradient-plum text-primary-foreground">
                      <MessageCircleMore className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold">Custom request inbox</h2>
                      <p className="text-sm text-muted-foreground">1 conversation ready</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl bg-secondary/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">Priya S. • {CUSTOM_REQUEST_ID}</p>
                      <Badge className={cn("rounded-full", statusClass(request.status))}>{request.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      12 pastel space bag charms with individual names.
                    </p>
                    <p className="mt-3 text-sm font-bold">Quote: ${request.quote.toFixed(2)}</p>
                  </div>
                  <Button variant="hero" className="mt-4 w-full" onClick={() => setSection("requests")}>
                    Open Conversation
                  </Button>
                  <Button variant="soft" className="mt-2 w-full" asChild>
                    <Link to="/custom-orders" target="_blank">
                      Customer View <ExternalLink aria-hidden />
                    </Link>
                  </Button>
                </section>
              </div>

              <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Demo sales activity</h2>
                    <p className="mt-1 text-sm text-muted-foreground">A lightweight visual for the client presentation</p>
                  </div>
                  <p className="font-display text-2xl font-bold text-primary">$2,540</p>
                </div>
                <div className="mt-6 flex h-40 items-end gap-2" aria-label="Mock monthly sales bars">
                  {mockMonthlySales.map((value, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-xl bg-gradient-plum opacity-80 transition-opacity hover:opacity-100"
                        style={{ height: `${Math.max(20, value)}px` }}
                        title={`Demo sales point ${index + 1}: $${value * 10}`}
                      />
                      <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {section === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Order management</p>
                  <h1 className="mt-1 text-3xl font-bold">Orders</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Review shipping, pickup and converted custom-order examples.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="soft" asChild>
                    <Link to="/orders/$orderId" params={{ orderId: SHIPPING_DEMO_ID }} target="_blank">
                      Shipping View <ExternalLink aria-hidden />
                    </Link>
                  </Button>
                  <Button variant="soft" asChild>
                    <Link to="/orders/$orderId" params={{ orderId: PICKUP_DEMO_ID }} target="_blank">
                      Pickup View <ExternalLink aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
                <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft sm:p-5">
                  <label htmlFor="admin-order-search" className="sr-only">Search orders</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground" aria-hidden />
                    <Input
                      id="admin-order-search"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search order, customer or status..."
                      className="h-11 rounded-full pl-11"
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-colors",
                          selectedOrder?.id === order.id
                            ? "border-primary/35 bg-secondary/50"
                            : "border-border hover:bg-secondary/25",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-primary">{order.id}</p>
                            <p className="mt-1 truncate text-sm font-bold">{order.customer}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              {order.fulfillment === "Shipping" ? <Truck className="size-3" /> : <Home className="size-3" />}
                              {order.fulfillment}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">${order.total.toFixed(2)}</p>
                            <Badge className={cn("mt-2 rounded-full", statusClass(order.status))}>{order.status}</Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {selectedOrder && (
                  <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Order detail</p>
                        <h2 className="mt-1 text-2xl font-bold">{selectedOrder.id}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Placed {selectedOrder.date}</p>
                      </div>
                      <Button variant="soft" size="sm" asChild>
                        <Link to="/orders/$orderId" params={{ orderId: selectedOrder.id }} target="_blank">
                          Customer View <ExternalLink aria-hidden />
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-secondary/35 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer</p>
                        <p className="mt-2 font-bold">{selectedOrder.customer}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{selectedOrder.email}</p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.phone}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary/35 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Fulfillment</p>
                        <p className="mt-2 font-bold">{selectedOrder.fulfillment}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedOrder.fulfillment === "Shipping"
                            ? selectedOrder.tracking || selectedOrder.address
                            : `${selectedOrder.pickupDate ?? "Date pending"} • ${selectedOrder.pickupWindow ?? "Time pending"}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-bold">Items</h3>
                        <p className="font-display text-xl font-bold">${selectedOrder.total.toFixed(2)}</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {selectedOrder.items.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="rounded-2xl border border-border p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold">{item.quantity}× {item.name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {[item.color, item.option, item.personalization].filter(Boolean).join(" • ")}
                                </p>
                              </div>
                              <p className="text-sm font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                      <div>
                        <label htmlFor="order-status" className="text-sm font-bold">Update order status</label>
                        <select
                          id="order-status"
                          value={selectedOrder.status}
                          onChange={(event) => updateOrderStatus(event.target.value as OrderStatus)}
                          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                      <div className="rounded-2xl bg-secondary/35 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment</p>
                        <p className="mt-2 flex items-center gap-2 font-bold">
                          <CheckCircle2 className="size-4 text-primary" aria-hidden /> {selectedOrder.payment}
                        </p>
                      </div>
                    </div>

                    {selectedOrder.adminNote && (
                      <div className="mt-5 rounded-2xl border border-dashed border-border p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Internal note</p>
                        <p className="mt-2 text-sm">{selectedOrder.adminNote}</p>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          )}

          {section === "requests" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Custom requests</p>
                  <h1 className="mt-1 text-3xl font-bold">Messages & Quotes</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chat with customers, send a quote and convert an accepted request into an order.
                  </p>
                </div>
                <Button variant="soft" asChild>
                  <Link to="/custom-orders" target="_blank">
                    Open Customer Chat <ExternalLink aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-3 rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
                  {CUSTOM_REQUESTS.map((item) => {
                    const live = item.id === CUSTOM_REQUEST_ID;
                    const displayStatus = live ? request.status : item.status;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedRequestId(item.id)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-colors",
                          selectedRequest?.id === item.id
                            ? "border-primary/35 bg-secondary/50"
                            : "border-border hover:bg-secondary/25",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-primary">{item.id}</p>
                            <p className="mt-1 truncate text-sm font-bold">{item.name}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{item.productType}</p>
                          </div>
                          <Badge className={cn("rounded-full", statusClass(displayStatus))}>{displayStatus}</Badge>
                        </div>
                        {live && <p className="mt-3 text-xs font-bold text-primary">Live presentation chat</p>}
                      </button>
                    );
                  })}
                </aside>

                <div className="space-y-5">
                  {selectedRequest && (
                    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{selectedRequest.id}</p>
                          <h2 className="mt-1 text-2xl font-bold">{selectedRequest.productType}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">{selectedRequest.name}</p>
                        </div>
                        <Badge className={cn("rounded-full px-4 py-2", statusClass(selectedRequest.id === CUSTOM_REQUEST_ID ? request.status : selectedRequest.status))}>
                          {selectedRequest.id === CUSTOM_REQUEST_ID ? request.status : selectedRequest.status}
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-secondary/35 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Budget</p>
                          <p className="mt-2 text-sm font-bold">{selectedRequest.budget}</p>
                        </div>
                        <div className="rounded-2xl bg-secondary/35 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Needed</p>
                          <p className="mt-2 text-sm font-bold">{selectedRequest.dateNeeded}</p>
                        </div>
                        <div className="rounded-2xl bg-secondary/35 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Fulfillment</p>
                          <p className="mt-2 text-sm font-bold">{selectedRequest.fulfillment}</p>
                        </div>
                      </div>

                      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{selectedRequest.idea}</p>

                      {selectedRequest.id === CUSTOM_REQUEST_ID ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button variant="soft" onClick={sendQuote}>
                            <DollarSign aria-hidden /> Send $126 Quote
                          </Button>
                          <Button
                            variant="hero"
                            onClick={convertToOrder}
                            disabled={request.status !== "Accepted"}
                          >
                            <PackageCheck aria-hidden /> Convert to Order
                          </Button>
                          {request.status !== "Accepted" && request.status !== "Converted" && (
                            <p className="self-center text-xs text-muted-foreground">
                              Customer must accept the quote first.
                            </p>
                          )}
                          {request.status === "Converted" && request.orderId && (
                            <Button variant="soft" asChild>
                              <Link to="/orders/$orderId" params={{ orderId: request.orderId }} target="_blank">
                                View {request.orderId} <ExternalLink aria-hidden />
                              </Link>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                          Static presentation request. Choose <strong className="text-foreground">REQ-208</strong> to use the live chat, typing indicator and quote conversion demo.
                        </p>
                      )}
                    </section>
                  )}

                  {selectedRequest?.id === CUSTOM_REQUEST_ID && (
                    <ChatRoom role="admin" requestId={CUSTOM_REQUEST_ID} compact />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
