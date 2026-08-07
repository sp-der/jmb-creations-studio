import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Facebook,
  Instagram,
  MailCheck,
  MapPin,
  Palette,
  PackageCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FloatingDecor, Sparkle } from "@/components/brand/Decor";
import { ProductPlaceholder } from "@/components/brand/ProductPlaceholder";
import { ProductCard } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, PRODUCTS, REVIEWS, SOCIAL } from "@/data/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JMB 2 Creations | 3D-Printed Charms, Gifts & Cosplay Creations" },
      {
        name: "description",
        content:
          "Family-run shop for 3D-printed bag charms, straw toppers, keychains, display shelves, cosplay props and personalized gifts. Shipping and local pickup.",
      },
      { property: "og:title", content: "JMB 2 Creations | Handmade & 3D-Printed Creations" },
      {
        property: "og:description",
        content:
          "Big imagination, printed into something special. Shop colorful charms, collectibles and personalized gifts.",
      },
    ],
  }),
  component: Home,
});

const TONE_CLASS: Record<string, string> = {
  pastel: "bg-gradient-to-br from-[oklch(0.93_0.05_350)] to-[oklch(0.88_0.06_330)]",
  lavender: "bg-gradient-to-br from-[oklch(0.9_0.05_300)] to-[oklch(0.82_0.08_288)]",
  mauve: "bg-gradient-to-br from-[oklch(0.92_0.04_330)] to-[oklch(0.8_0.07_330)]",
  periwinkle: "bg-gradient-to-br from-[oklch(0.88_0.06_290)] to-[oklch(0.72_0.1_285)]",
};

const STEPS = [
  {
    icon: Sparkles,
    title: "Choose a creation",
    text: "Browse the shop or start a custom request if you have your own idea.",
  },
  {
    icon: Palette,
    title: "Personalize your item",
    text: "Pick colors, add a name, choose sizes and tell us the theme.",
  },
  {
    icon: Truck,
    title: "Select shipping or pickup",
    text: "Ship it to your door or grab it locally on an available pickup day.",
  },
  {
    icon: PackageCheck,
    title: "Receive your creation",
    text: "We print, finish and hand-check every piece before it goes out.",
  },
];

function Home() {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 8);
  const [email, setEmail] = useState("");

  return (
    <StoreLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <FloatingDecor />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-soft">
              <Sparkle className="size-3.5" /> Family-run maker studio
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Big Imagination, Printed Into Something Special
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Discover colorful 3D-printed charms, collectibles, cosplay creations, personalized
              gifts, and more from our family-run shop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/shop">
                  Shop All Creations <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button variant="soft" size="lg" asChild>
                <Link to="/custom-orders">Request a Custom Item</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                ["150+", "designs printed"],
                ["3–5 days", "typical turnaround"],
                ["Free", "local pickup"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-card/80 p-3 shadow-soft">
                  <dt className="font-display text-lg font-bold text-primary">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="relative rounded-[2.5rem] bg-card p-4 shadow-lift">
              <img
  src="/logo.png"
  alt="JMB 2 Creations logo"
  className="aspect-square w-full rounded-[2rem] object-cover"
  width={640}
  height={640}
/>
            </div>
            <div className="absolute -left-6 -top-6 hidden w-28 rotate-[-8deg] animate-float-slow sm:block">
              <ProductPlaceholder compact seed={1} className="aspect-square w-full shadow-soft" />
            </div>
            <div className="absolute -bottom-8 -left-4 hidden w-24 rotate-6 animate-float-mid sm:block">
              <ProductPlaceholder compact seed={2} className="aspect-square w-full shadow-soft" />
            </div>
            <div className="absolute -right-6 bottom-10 hidden w-28 rotate-[10deg] animate-float-slow sm:block">
              <ProductPlaceholder compact seed={3} className="aspect-square w-full shadow-soft" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Browse</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Shop by category</h2>
          </div>
          <Button variant="soft" asChild>
            <Link to="/categories">View All Categories</Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to="/shop"
              search={{ category: cat.slug }}
              className="card-lift group rounded-[1.75rem] border border-border bg-card p-3 shadow-soft"
            >
              <div
                className={`grid aspect-[4/3] place-items-center rounded-2xl ${TONE_CLASS[cat.tone]}`}
              >
                <span className="font-display text-lg font-bold text-foreground/80">
                  {cat.name}
                </span>
              </div>
              <div className="px-2 py-3">
                <h3 className="text-base font-bold">{cat.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{cat.blurb}</p>
                <p className="mt-2 text-xs font-semibold text-primary">
                  {cat.count} creations <ArrowRight className="inline size-3" aria-hidden />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                Fresh off the printer
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Featured creations</h2>
            </div>
            <Button variant="soft" asChild>
              <Link to="/shop">See everything</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOM */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-plum px-6 py-14 text-center shadow-lift sm:px-12">
          <FloatingDecor className="opacity-40" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
              Have an Idea? Let's Create It.
            </h2>
            <p className="mt-4 text-base text-primary-foreground/85">
              Request custom colors, names, themes, sizes — or a completely original item designed
              from scratch. Tell us what you're picturing and we'll come back with options, pricing
              and a timeline.
            </p>
            <Button variant="sweet" size="lg" className="mt-8" asChild>
              <Link to="/custom-orders">Start a Custom Request</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">How ordering works</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="card-lift rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-sweet text-foreground">
                  <step.icon className="size-6" aria-hidden />
                </span>
                <span className="font-display text-3xl font-bold text-secondary">{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAMILY STORY */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <ProductPlaceholder
            label="Family / behind-the-scenes workshop photo"
            seed={2}
            className="aspect-[4/3] w-full shadow-soft"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Our story</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Made by our family, for yours</h2>
            <p className="mt-4 text-base text-muted-foreground">
              JMB 2 Creations started as a family hobby and grew into a small business we run
              together. Our printers hum away in the evenings while we sketch new charms, test color
              combos and figure out how to turn someone's idea into something they can hold.
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              You'll find us at flea and farmers markets, on social media, and now right here. Every
              order is packed by hand — and yes, we still get excited every time a print comes off
              the plate.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="soft" asChild>
                <Link to="/about">More about us</Link>
              </Button>
              <Button variant="hero" asChild>
                <Link to="/shop">Shop our creations</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">See What We're Printing</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Follow along for new drops, works in progress and market days. This grid will connect to
            our real posts.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="hero" asChild>
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer noopener">
                <Instagram aria-hidden /> Follow on Instagram
              </a>
            </Button>
            <Button variant="soft" asChild>
              <a href={SOCIAL.facebook} target="_blank" rel="noreferrer noopener">
                <Facebook aria-hidden /> Follow on Facebook
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductPlaceholder
              key={i}
              compact
              seed={i}
              label={`Social post placeholder ${i + 1}`}
              className="aspect-square w-full"
            />
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Kind words from customers</h2>
          <p className="mt-2 text-sm font-semibold text-mauve">
            Sample placeholder reviews — real reviews will replace these.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure
              key={r.name}
              className="card-lift rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex gap-1" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-pastel text-pastel" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 text-sm text-muted-foreground">"{r.text}"</blockquote>
              <figcaption className="mt-4 text-sm font-bold">
                {r.name}
                <span className="block text-xs font-normal text-muted-foreground">
                  {r.location}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="rounded-[2.5rem] border border-border bg-card p-8 shadow-soft sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Get the new drops first</h2>
              <p className="mt-3 text-muted-foreground">
                Join our list for new product drops, sales and seasonal releases. A few emails a
                month, never spam.
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden /> Mockup form — no emails are sent yet.
              </p>
            </div>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
                  toast.error("Please enter a valid email address.");
                  return;
                }
                toast.success("You're on the list! (demo only)");
                setEmail("");
              }}
            >
              <div className="flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 rounded-full"
                  required
                />
              </div>
              <Button type="submit" variant="hero" size="lg">
                <MailCheck aria-hidden /> Sign me up
              </Button>
            </form>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
