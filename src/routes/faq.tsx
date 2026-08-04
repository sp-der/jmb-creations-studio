import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FAQS } from "@/data/catalog";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ: Shipping, Pickup & Custom Orders | JMB 2 Creations" },
      {
        name: "description",
        content:
          "Answers about turnaround times, local pickup, custom colors, bulk orders, care instructions and our decorative cosplay props.",
      },
      { property: "og:title", content: "JMB 2 Creations FAQ" },
      { property: "og:description", content: "Everything you need to know before you order." },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Help center"
        title="Frequently asked questions"
        subtitle="Turnaround times, pickup, customization and care — all in one place."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="rounded-[1.5rem] border border-border bg-card px-5 shadow-soft"
            >
              <AccordionTrigger className="text-left text-base font-bold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 rounded-[1.75rem] bg-gradient-plum p-8 text-center shadow-soft">
          <h2 className="text-2xl font-bold text-primary-foreground">Still have a question?</h2>
          <p className="mt-2 text-sm text-primary-foreground/85">
            We're happy to help — usually within a day.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="sweet" asChild>
              <Link to="/contact">Contact us</Link>
            </Button>
            <Button variant="soft" asChild>
              <Link to="/custom-orders">Start a custom request</Link>
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}