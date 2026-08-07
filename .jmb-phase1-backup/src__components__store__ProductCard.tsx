import { Link } from "@tanstack/react-router";
import { Eye, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductPlaceholder } from "@/components/brand/ProductPlaceholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/data/catalog";
import { formatPrice, useCart } from "@/lib/cart";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem } = useCart();
  const [quickView, setQuickView] = useState(false);

  const add = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.price,
      quantity: 1,
      color: product.colors[0] ?? "",
    });
    toast.success("Added to cart", { description: product.name });
  };

  return (
    <>
      <article className="card-lift group flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft">
        <div className="relative p-3">
          <Link to="/product/$slug" params={{ slug: product.slug }} aria-label={product.name}>
            <ProductPlaceholder
              label={product.name}
              seed={index}
              className="aspect-square w-full"
            />
          </Link>
          <div className="absolute left-5 top-5 flex flex-col gap-1.5">
            {product.badge && (
              <Badge className="rounded-full bg-gradient-plum px-3 text-primary-foreground">
                {product.badge}
              </Badge>
            )}
            {product.customizable && (
              <Badge className="rounded-full bg-card px-3 text-foreground shadow-soft">
                <Sparkles className="mr-1 size-3" aria-hidden />
                Customizable
              </Badge>
            )}
            {!product.inStock && (
              <Badge variant="secondary" className="rounded-full px-3">
                Sold out
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 px-5 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-mauve">
            {product.category}
          </p>
          <h3 className="text-base font-bold leading-snug">
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              className="hover:text-primary"
            >
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Starting at{" "}
            <span className="text-base font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
          </p>

          <div className="mt-4 flex gap-2">
            <Button
              variant="soft"
              size="sm"
              className="flex-1"
              onClick={() => setQuickView(true)}
              aria-label={`Quick view: ${product.name}`}
            >
              <Eye aria-hidden />
              Quick view
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="flex-1"
              onClick={add}
              disabled={!product.inStock}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag aria-hidden />
              {product.inStock ? "Add" : "Sold out"}
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={quickView} onOpenChange={setQuickView}>
        <DialogContent className="max-w-2xl rounded-[1.75rem]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
            <DialogDescription>
              {product.category} · Starting at {formatPrice(product.price)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <ProductPlaceholder label={product.name} seed={index} className="aspect-square w-full" />
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{product.description}</p>
              <ul className="space-y-1 text-sm">
                {product.details.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lavender" />
                    {d}
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                <span className="font-semibold">Colors:</span> {product.colors.join(", ")}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Processing:</span> {product.processingDays}
              </p>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Button variant="hero" onClick={add} disabled={!product.inStock}>
                  Add to cart
                </Button>
                <Button variant="soft" asChild>
                  <Link to="/product/$slug" params={{ slug: product.slug }}>
                    View full details
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}