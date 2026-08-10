import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Facebook, Instagram, PackageCheck, Palette, Sparkles, Truck } from "lucide-react";
import { FloatingDecor, Sparkle } from "@/components/brand/Decor";
import { ProductCard } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { SOCIAL } from "@/data/catalog";
import { useStorefrontCatalog } from "@/lib/catalog-families";
import { HERO_FLOAT_IMAGES } from "@/data/catalog-assets";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "JMB 2 Creations | Custom 3D-Printed Creations" }, { name: "description", content: "Shop JMB 2 Creations products, available designs, custom creations, shipping, and local pickup." }] }),
  component: Home,
});

const STEPS = [
  { icon: Sparkles, title: "Choose a creation", text: "Browse a product collection and pick the design you want." },
  { icon: Palette, title: "Personalize your item", text: "Choose available options or send JMB a custom request." },
  { icon: Truck, title: "Select shipping or pickup", text: "Choose the fulfillment option that works for your order." },
  { icon: PackageCheck, title: "Receive your creation", text: "JMB makes, checks, and prepares your finished item." },
];

function Home() {
  const { products, designCounts } = useStorefrontCatalog();
  return (
    <StoreLayout>
      <section className="relative overflow-hidden bg-gradient-hero">
        <FloatingDecor />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div className="animate-rise">
            <img src="/logo.png" alt="JMB 2 Creations" className="mx-auto mb-5 w-36 object-contain drop-shadow-[0_10px_18px_rgba(88,90,170,0.16)] sm:hidden" />
            <span className="mx-auto flex w-fit items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-soft sm:mx-0 sm:inline-flex"><Sparkle className="size-3.5" /> Family-run maker studio</span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">Big Imagination, Printed Into Something Special</h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">Shop JMB 2 Creations product collections, browse the designs currently available, or request something made around your own idea.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild><Link to="/shop">Shop Products <ArrowRight aria-hidden /></Link></Button>
              <Button variant="soft" size="lg" asChild><Link to="/custom-orders">Request a Custom Item</Link></Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-center">
              {[ ["Custom", "made to order"], ["Shipping", "available"], ["Local", "pickup available"] ].map(([value, label]) => <div key={label} className="rounded-2xl bg-card/80 p-3 shadow-soft"><dt className="font-display text-lg font-bold text-primary">{value}</dt><dd className="text-xs text-muted-foreground">{label}</dd></div>)}
            </dl>
          </div>
          <div className="relative mx-auto hidden w-full max-w-md sm:block">
            <div className="relative rounded-[2.5rem] bg-card p-4 shadow-lift"><img src="/logo.png" alt="JMB 2 Creations logo" className="w-full rounded-[2rem] object-contain" width={640} height={640} onError={(event) => { event.currentTarget.src = "/logoheader.png"; }} /></div>
            {HERO_FLOAT_IMAGES[0] && <img src={HERO_FLOAT_IMAGES[0]} alt="JMB creation" className="absolute -left-16 -top-14 hidden w-40 rotate-[-8deg] animate-float-slow object-contain drop-shadow-[0_18px_22px_rgba(88,90,170,0.22)] sm:block lg:w-44" />}
            {HERO_FLOAT_IMAGES[1] && <img src={HERO_FLOAT_IMAGES[1]} alt="JMB creation" className="absolute -bottom-12 -left-12 hidden w-36 rotate-6 animate-float-mid object-contain drop-shadow-[0_18px_22px_rgba(88,90,170,0.22)] sm:block lg:w-40" />}
            {HERO_FLOAT_IMAGES[2] && <img src={HERO_FLOAT_IMAGES[2]} alt="JMB creation" className="absolute -right-16 bottom-6 hidden w-40 rotate-[10deg] animate-float-slow object-contain drop-shadow-[0_18px_22px_rgba(88,90,170,0.22)] sm:block lg:w-44" />}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Browse</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Shop by category</h2></div><Button variant="soft" asChild><Link to="/categories">View All Categories</Link></Button></div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => { const count = designCounts[product.slug] ?? product.designs.length; return <Link key={product.slug} to="/category/$slug" params={{ slug: product.categorySlug }} className="card-lift group overflow-hidden rounded-[1.75rem] border border-border bg-card p-3 shadow-soft"><img src={product.mainImage} alt={product.name} className="aspect-[4/5] w-full rounded-2xl object-cover" loading="lazy" /><div className="px-2 py-3"><h3 className="text-base font-bold">{product.name}</h3><p className="mt-1 text-xs text-muted-foreground">{count} {count === 1 ? "design" : "designs"} available</p></div></Link>; })}
        </div>
      </section>

      <section className="bg-secondary/30 py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Shop</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Product collections</h2></div><Button variant="soft" asChild><Link to="/shop">See all products</Link></Button></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} designCount={designCounts[product.slug]} />)}</div></div></section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6"><div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-plum px-6 py-14 text-center shadow-lift sm:px-12"><FloatingDecor className="opacity-40" /><div className="relative mx-auto max-w-2xl"><h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">Have an Idea? Let's Create It.</h2><p className="mt-4 text-base text-primary-foreground/85">Send JMB your colors, theme, size, quantity, and reference images. Custom requests can be reviewed and discussed before the order is finalized.</p><Button variant="sweet" size="lg" className="mt-8" asChild><Link to="/custom-orders">Start a Custom Request</Link></Button></div></div></section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6"><h2 className="text-center text-3xl font-bold sm:text-4xl">How ordering works</h2><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map((step, index) => <div key={step.title} className="card-lift rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-sweet text-foreground"><step.icon className="size-6" /></span><span className="font-display text-3xl font-bold text-secondary">{index + 1}</span></div><h3 className="mt-4 text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm text-muted-foreground">{step.text}</p></div>)}</div></section>

      <section className="bg-secondary/30 py-16"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Our story</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Made by our family, for yours</h2><p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">JMB 2 Creations is a family-run creative shop making custom 3D-printed products, collectibles, display pieces, cosplay creations, gifts, and more. Browse what is available now or send an idea for something personal.</p><Button variant="soft" className="mt-6" asChild><Link to="/about">More about us</Link></Button></div></section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6"><h2 className="text-3xl font-bold sm:text-4xl">See What We're Creating</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">Follow JMB 2 Creations for new designs, works in progress, and upcoming drops.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="hero" asChild><a href={SOCIAL.instagram} target="_blank" rel="noreferrer noopener"><Instagram aria-hidden /> Instagram</a></Button><Button variant="soft" asChild><a href={SOCIAL.facebook} target="_blank" rel="noreferrer noopener"><Facebook aria-hidden /> Facebook</a></Button></div></section>
    </StoreLayout>
  );
}
