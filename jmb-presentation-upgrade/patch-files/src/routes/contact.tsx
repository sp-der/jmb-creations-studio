import { createFileRoute } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, MessageCircleMore, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL } from "@/data/catalog";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | JMB 2 Creations" },
      {
        name: "description",
        content: "Contact JMB 2 Creations about products, orders, pickup and custom ideas.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [message, setMessage] = useState("");

  return (
    <StoreLayout>
      <PageHeader
        eyebrow="Let's talk"
        title="Contact JMB 2 Creations"
        subtitle="Ask about a product, an existing order, local pickup or a creative idea. This form is a presentation mockup for now."
      />

      <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" placeholder="Your name" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="you@example.com" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="contact-topic">What can we help with?</Label>
              <select id="contact-topic" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                <option>Product question</option>
                <option>Existing order</option>
                <option>Pickup question</option>
                <option>Custom creation</option>
                <option>Bulk or event order</option>
              </select>
            </div>
            <div>
              <Label htmlFor="contact-order">Order number, if applicable</Label>
              <Input id="contact-order" placeholder="JMB-1042" className="mt-2" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us how we can help..."
                className="mt-2 min-h-36"
              />
            </div>
          </div>
          <Button
            variant="hero"
            size="lg"
            className="mt-6"
            onClick={() => {
              toast.success("Demo message submitted", {
                description: "Email delivery will be connected during production setup.",
              });
              setMessage("");
            }}
          >
            <Send aria-hidden /> Send Demo Message
          </Button>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
            <MessageCircleMore className="size-6 text-primary" aria-hidden />
            <h2 className="mt-4 text-xl font-bold">Custom creation?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The custom-order chat is the best place to discuss colors, themes, reference images and quotes.
            </p>
            <Button variant="hero" className="mt-4 w-full" asChild>
              <a href="/custom-orders">Open Custom Chat</a>
            </Button>
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-soft">
            <h2 className="text-xl font-bold">Find Us Online</h2>
            <div className="mt-4 space-y-3">
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-secondary/35 p-4 text-sm font-bold hover:bg-secondary/60">
                <Instagram className="size-5 text-primary" /> Instagram
              </a>
              <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-secondary/35 p-4 text-sm font-bold hover:bg-secondary/60">
                <Facebook className="size-5 text-primary" /> Facebook
              </a>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-dashed border-border bg-card p-5">
            <p className="flex items-center gap-3 text-sm font-bold"><Mail className="size-4 text-primary" /> Email placeholder</p>
            <p className="mt-3 flex items-start gap-3 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> Exact pickup details are only shared with confirmed customers.</p>
          </section>
        </aside>
      </div>
    </StoreLayout>
  );
}
