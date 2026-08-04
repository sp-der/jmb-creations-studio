import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  Heart,
  ImagePlus,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ProductPlaceholder } from "@/components/brand/ProductPlaceholder";
import { ProductCard } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProduct, relatedProducts } from "@/data/catalog";
import { formatPrice, useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const product = getProduct(params.slug);
    return {
      meta: [
        { title: product ? `${product.name} | JMB 2 Creations` : "Creation Not Found | JMB 2 Creations" },
        {
          name: "description",
          content: product?.description ?? "Browse JMB 2 Creations products.",
        },
      ],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const product = getProduct(slug);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState(product?.colors[0] ?? "");
  const [option, setOption] = useState(product?.options?.values[0] ?? "");
  const [personalization, setPersonalization] = useState("");
  const [note, setNote] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  const related = useMemo(() => (product ? relatedProducts(product, 4) : []), [product]);

  if (!product) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <Sparkles className="mx-auto size-12 text-primary" aria-hidden />
          <h1 className="mt-5 text-3xl font-bold">Creation not found</h1>
          <p className="mt-3 text-muted-foreground">That product may have moved or is still being prepared for the mockup.</p>
          <Button variant="hero" className="mt-6" asChild>
            <Link to="/shop">Return to Shop</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const addToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.price,
      quantity,
      color,
      option,
      personalization,
      note,
    });
    toast.success("Added to cart", { description: `${quantity} × ${product.name}` });
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <Button variant="soft" size="sm" asChild>
          <Link to="/shop">
            <ArrowLeft aria-hidden /> Back to Shop
          </Link>
        </Button>

        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
          <section>
            <div className="rounded-[2rem] border border-border bg-card p-4 shadow-lift">
              <ProductPlaceholder
                label={product.name}
                seed={selectedImage}
                className="aspect-square w-full rounded-[1.5rem]"
              />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {Array.from({ length: Math.min(product.images, 4) }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "rounded-2xl border p-1 transition-all",
                    selectedImage === index ? "border-primary ring-2 ring-primary/15" : "border-border",
                  )}
                  aria-label={`View product placeholder ${index + 1}`}
                >
                  <ProductPlaceholder label={`View ${index + 1}`} seed={index} compact className="aspect-square w-full" />
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <ImagePlus className="size-5 shrink-0 text-primary" aria-hidden />
              Real product photography will replace these placeholders after client approval.
            </div>
          </section>

          <section>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-gradient-plum text-primary-foreground">{product.category}</Badge>
              {product.badge && <Badge variant="secondary" className="rounded-full">{product.badge}</Badge>}
              {product.customizable && (
                <Badge variant="secondary" className="rounded-full">
                  <Sparkles className="mr-1 size-3" /> Customizable
                </Badge>
              )}
            </div>

            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-end gap-3">
              <p className="font-display text-3xl font-bold text-primary">{formatPrice(product.price)}</p>
              {product.compareAt && <p className="pb-1 text-lg text-muted-foreground line-through">{formatPrice(product.compareAt)}</p>}
            </div>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{product.description}</p>

            <ul className="mt-5 space-y-2">
              {product.details.map((detail) => (
                <li key={detail} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {detail}
                </li>
              ))}
            </ul>

            <div className="mt-7 space-y-5 rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-6">
              <div>
                <Label>Color</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.colors.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setColor(choice)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        color === choice
                          ? "border-primary bg-secondary text-primary"
                          : "border-border bg-background hover:bg-secondary/35",
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              {product.options && (
                <div>
                  <Label htmlFor="product-option">{product.options.label}</Label>
                  <select
                    id="product-option"
                    value={option}
                    onChange={(event) => setOption(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {product.options.values.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              )}

              {product.customizable && (
                <div>
                  <Label htmlFor="product-personalization">Personalization</Label>
                  <Input
                    id="product-personalization"
                    value={personalization}
                    onChange={(event) => setPersonalization(event.target.value)}
                    placeholder="Name, number or short wording"
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="product-note">Order note</Label>
                <Textarea
                  id="product-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Tell us anything else about colors, timing or your idea."
                  className="mt-2 min-h-24"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1">
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">
                    <Minus />
                  </Button>
                  <span className="min-w-8 text-center font-bold">{quantity}</span>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuantity((value) => Math.min(99, value + 1))} aria-label="Increase quantity">
                    <Plus />
                  </Button>
                </div>
                <Button variant="hero" size="lg" className="min-w-52 flex-1" onClick={addToCart} disabled={!product.inStock}>
                  <ShoppingBag aria-hidden /> {product.inStock ? "Add to Cart" : "Sold Out"}
                </Button>
                <Button type="button" variant="soft" size="icon" aria-label="Save to favorites" onClick={() => toast.success("Saved to demo favorites") }>
                  <Heart />
                </Button>
              </div>

              <Button variant="soft" className="w-full" asChild>
                <Link to="/custom-orders">
                  <Sparkles aria-hidden /> Need a Different Custom Version?
                </Link>
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-secondary/35 p-4 text-center">
                <Clock3 className="mx-auto size-5 text-primary" aria-hidden />
                <p className="mt-2 text-xs font-bold">{product.processingDays}</p>
              </div>
              <div className="rounded-2xl bg-secondary/35 p-4 text-center">
                <Truck className="mx-auto size-5 text-primary" aria-hidden />
                <p className="mt-2 text-xs font-bold">Shipping available</p>
              </div>
              <div className="rounded-2xl bg-secondary/35 p-4 text-center">
                <PackageCheck className="mx-auto size-5 text-primary" aria-hidden />
                <p className="mt-2 text-xs font-bold">Local pickup</p>
              </div>
            </div>

            {(product.care || product.safety) && (
              <div className="mt-5 space-y-3 rounded-2xl border border-border p-5">
                {product.care && (
                  <p className="text-sm"><strong>Care:</strong> <span className="text-muted-foreground">{product.care}</span></p>
                )}
                {product.safety && (
                  <p className="flex gap-3 text-sm">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <span><strong>Safety:</strong> <span className="text-muted-foreground">{product.safety}</span></span>
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="mt-16 border-t border-border pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">You may also like</p>
              <h2 className="mt-2 text-3xl font-bold">More Creations</h2>
            </div>
            <Button variant="soft" asChild>
              <Link to="/shop">View All Products</Link>
            </Button>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item, index) => <ProductCard key={item.id} product={item} index={index + 5} />)}
          </div>
        </section>
      </div>
    </StoreLayout>
  );
}
