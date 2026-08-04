import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileImage,
  LayoutDashboard,
  MessageCircleMore,
  PackageCheck,
  Palette,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ChatRoom } from "@/components/presentation/ChatRoom";
import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CUSTOM_DEMO_ID, CUSTOM_REQUEST_ID } from "@/data/presentation";
import {
  getDemoRequestState,
  resetPresentationDemo,
  saveDemoRequestState,
  subscribePresentation,
  type DemoRequestState,
} from "@/lib/presentation-sync";

export const Route = createFileRoute("/custom-orders")({
  head: () => ({
    meta: [
      { title: "Custom Order Chat Demo | JMB 2 Creations" },
      {
        name: "description",
        content:
          "Presentation mockup for a JMB 2 Creations custom order conversation, quote and order conversion.",
      },
    ],
  }),
  component: CustomOrdersPage,
});

const requestDetails = [
  ["Product", "12 personalized bag charms"],
  ["Theme", "Pastel space"],
  ["Colors", "Lavender, blush pink, pearl white"],
  ["Size", "About 2 inches"],
  ["Needed by", "August 29, 2026"],
  ["Fulfillment", "Local pickup"],
] as const;

function CustomOrdersPage() {
  const [request, setRequest] = useState<DemoRequestState>(() => getDemoRequestState());

  useEffect(() => {
    const sync = () => setRequest(getDemoRequestState());
    sync();
    return subscribePresentation(sync);
  }, []);

  const acceptQuote = () => {
    const updated: DemoRequestState = { ...request, status: "Accepted" };
    saveDemoRequestState(updated);
    setRequest(updated);
    toast.success("Demo quote accepted", {
      description: "The admin can now convert this request into an order.",
    });
  };

  const resetDemo = () => {
    resetPresentationDemo();
    setRequest(getDemoRequestState());
    toast.success("Presentation reset", {
      description: "Messages and custom-order status returned to the starting demo state.",
    });
  };

  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Presentation workflow"
        title="Your Custom Creation Chat"
        subtitle="A customer and JMB 2 Creations can discuss ideas, share references, approve a quote and turn the conversation into an order."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-secondary/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <span>
              <strong>Presentation mode:</strong> no account or live database is required yet.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" size="sm" onClick={resetDemo}>
              <RefreshCcw aria-hidden /> Reset Demo
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/admin">
                <LayoutDashboard aria-hidden /> Open Admin View
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Custom request
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Pastel Space Party Charms</h2>
                </div>
                <Badge className="rounded-full bg-gradient-plum text-primary-foreground">
                  {request.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Demo customer Priya is planning party favors and needs twelve individually named
                charms.
              </p>

              <dl className="mt-5 space-y-3">
                {requestDetails.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-secondary/35 px-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border p-4">
                <FileImage className="size-5 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-bold">3 reference images</p>
                  <p className="text-xs text-muted-foreground">Placeholder attachments</p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <MessageCircleMore className="size-5 text-primary" aria-hidden />
                <h2 className="text-lg font-bold">Quote & order</h2>
              </div>

              <div className="mt-4 rounded-2xl bg-gradient-to-br from-secondary to-card p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Presentation quote
                </p>
                <p className="mt-1 font-display text-3xl font-bold">${request.quote.toFixed(2)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  12 custom charms • local pickup • estimated 2–3 weeks
                </p>
              </div>

              {request.status === "Quoted" && (
                <Button className="mt-4 w-full" variant="hero" onClick={acceptQuote}>
                  <BadgeCheck aria-hidden /> Accept Demo Quote
                </Button>
              )}

              {request.status === "Accepted" && (
                <div className="mt-4 rounded-2xl border border-primary/25 bg-secondary/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-primary">
                    <CheckCircle2 className="size-4" aria-hidden /> Quote accepted
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    The admin view can now convert this request into a mock order.
                  </p>
                </div>
              )}

              {request.status === "Converted" && request.orderId && (
                <div className="mt-4 space-y-3 rounded-2xl border border-primary/25 bg-secondary/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-primary">
                    <PackageCheck className="size-4" aria-hidden /> Converted to {request.orderId}
                  </p>
                  <Button variant="hero" className="w-full" asChild>
                    <Link to="/orders/$orderId" params={{ orderId: request.orderId }}>
                      View Custom Order
                    </Link>
                  </Button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-secondary/30 p-3">
                  <Palette className="mx-auto size-5 text-primary" aria-hidden />
                  <p className="mt-2 text-xs font-bold">Color approval</p>
                </div>
                <div className="rounded-2xl bg-secondary/30 p-3">
                  <Clock3 className="mx-auto size-5 text-primary" aria-hidden />
                  <p className="mt-2 text-xs font-bold">Timeline updates</p>
                </div>
              </div>
            </section>

            {request.status !== "Converted" && (
              <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                After the customer accepts the quote, open the admin dashboard and choose
                <strong className="text-foreground"> Convert to Order</strong>. The new order will
                appear here automatically.
              </p>
            )}

            {request.status === "Converted" && request.orderId === CUSTOM_DEMO_ID && (
              <p className="rounded-2xl border border-primary/20 bg-secondary/30 p-4 text-xs text-muted-foreground">
                The custom request is now part of the same mock order system as regular shipping
                and pickup purchases.
              </p>
            )}
          </aside>

          <ChatRoom role="customer" requestId={CUSTOM_REQUEST_ID} />
        </div>
      </div>
    </StoreLayout>
  );
}
