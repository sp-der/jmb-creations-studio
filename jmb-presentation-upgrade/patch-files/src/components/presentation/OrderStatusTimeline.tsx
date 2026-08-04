import { Check, Circle } from "lucide-react";

import { ORDER_STATUSES, type Order, type OrderStatus } from "@/data/orders";
import { cn } from "@/lib/utils";

const DISPLAY_STATUSES: OrderStatus[] = [
  "Order Received",
  "Payment Confirmed",
  "In Production",
  "Ready for Pickup",
  "Shipped",
  "Completed",
];

export function OrderStatusTimeline({ order }: { order: Order }) {
  const relevantStatuses = DISPLAY_STATUSES.filter((status) => {
    if (order.fulfillment === "Shipping" && status === "Ready for Pickup") return false;
    if (order.fulfillment === "Local Pickup" && status === "Shipped") return false;
    return true;
  });

  const currentIndex = relevantStatuses.indexOf(order.status);
  const cancelled = order.status === "Cancelled";

  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Order progress">
      {relevantStatuses.map((status, index) => {
        const complete = !cancelled && currentIndex >= index;
        const current = !cancelled && currentIndex === index;
        return (
          <li
            key={status}
            className={cn(
              "relative rounded-2xl border p-4",
              complete ? "border-primary/30 bg-secondary/50" : "border-border bg-card",
              current && "ring-2 ring-primary/20",
            )}
          >
            <div
              className={cn(
                "mb-3 grid size-8 place-items-center rounded-full",
                complete
                  ? "bg-gradient-plum text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground",
              )}
            >
              {complete ? <Check className="size-4" aria-hidden /> : <Circle className="size-3" aria-hidden />}
            </div>
            <p className="text-sm font-bold">{status}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {current ? "Current status" : complete ? "Completed" : "Upcoming"}
            </p>
          </li>
        );
      })}
      {cancelled && (
        <li className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:col-span-2 lg:col-span-5">
          <p className="font-bold text-destructive">Order cancelled</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This presentation order has been marked cancelled.
          </p>
        </li>
      )}
    </ol>
  );
}

export function isKnownOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}
