import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/legal/$policy")({
  head: ({ params }) => ({
    meta: [
      { title: `${titleFor(params.policy)} | JMB 2 Creations` },
      {
        name: "description",
        content: `Presentation placeholder for the JMB 2 Creations ${titleFor(params.policy).toLowerCase()}.`,
      },
    ],
  }),
  component: LegalPage,
});

function titleFor(policy: string) {
  if (policy === "privacy") return "Privacy Policy";
  if (policy === "terms") return "Terms & Conditions";
  if (policy === "refunds") return "Refund Policy";
  return "Store Policy";
}

const policyCopy: Record<string, string[]> = {
  privacy: [
    "This presentation page shows where the final privacy policy will live.",
    "The production policy will explain what customer information is collected for accounts, orders, shipping, local pickup and custom-request chats.",
    "It will also describe how payment providers, email services and secure file storage are used without selling customer information.",
  ],
  terms: [
    "This presentation page shows where the final store terms will live.",
    "Production terms will cover order acceptance, custom-item approvals, turnaround estimates, customer-provided wording and images, payment requirements and local pickup expectations.",
    "Decorative cosplay props will be clearly identified as costume or display items rather than functional weapons.",
  ],
  refunds: [
    "This presentation page shows where the final refund and remake policy will live.",
    "Production rules will distinguish standard products from personalized and custom creations, explain cancellation windows and describe how damaged shipments are handled.",
    "Final wording should be reviewed with the business owner before launch.",
  ],
};

function LegalPage() {
  const { policy } = Route.useParams();
  const title = titleFor(policy);
  const paragraphs = policyCopy[policy] ?? ["This policy page will be completed before the production website launches."];

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Button variant="soft" size="sm" asChild>
          <Link to="/">
            <ArrowLeft aria-hidden /> Back Home
          </Link>
        </Button>

        <div className="mt-8 rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-10">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-plum text-primary-foreground">
              <FileText className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Presentation placeholder</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
            </div>
          </div>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          <div className="mt-8 flex gap-3 rounded-2xl border border-primary/20 bg-secondary/40 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>
              This is intentionally marked as mockup content. Final policies will be written and approved before live payments are enabled.
            </p>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
