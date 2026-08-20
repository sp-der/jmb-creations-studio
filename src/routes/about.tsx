import { Link, createFileRoute } from "@tanstack/react-router";
import { Heart, Recycle, Sparkles, Users } from "lucide-react";

import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Our Family Shop | JMB 2 Creations" },
      {
        name: "description",
        content:
          "JMB 2 Creations is a family-run shop that turns creative ideas into 3D-printed charms, collectibles, cosplay props and personalized gifts.",
      },
      { property: "og:title", content: "About JMB 2 Creations" },
      {
        property: "og:description",
        content: "Meet the family behind the printers, markets and colorful creations.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  { icon: Heart, title: "Family made", text: "Every order is designed, printed and packed by our family." },
  { icon: Sparkles, title: "Original designs", text: "Original and inspired-by designs — never licensed artwork." },
  { icon: Users, title: "Market roots", text: "We started at flea and farmers markets and still love them." },
  { icon: Recycle, title: "Made to order", text: "Small batches keep waste down and colors fresh." },
];

function About() {
  return (
    <StoreLayout>
      <PageHeader
        eyebrow="About us"
        title="A family-run maker studio"
        subtitle="We love turning creative ideas into physical, colorful things you can hold."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-3xl font-bold">How we got here</h2>
          <p className="mt-4 text-muted-foreground">
            It started with one printer on the kitchen table and a lot of curiosity. One charm became
            a set, a set became a market table, and eventually JMB 2 Creations became the little
            family business it is today.
          </p>
          <p className="mt-4 text-muted-foreground">
            We sell through Facebook Marketplace, social media and local markets — and now through
            our own shop, so you can browse, personalize and order any time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="hero" asChild>
              <Link to="/shop">Shop our creations</Link>
            </Button>
            <Button variant="soft" asChild>
              <Link to="/custom-orders">Request a custom item</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-secondary/30 py-14">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="card-lift rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-sweet">
                <v.icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </StoreLayout>
  );
}