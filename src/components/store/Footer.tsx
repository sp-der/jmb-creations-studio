import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, MapPin, Truck } from "lucide-react";

import { SOCIAL } from "@/data/catalog";

const shopLinks = [
  { to: "/shop", label: "All Creations" },
  { to: "/custom-orders", label: "Custom Order Chat" },
  { to: "/cart", label: "Checkout Demo" },
] as const;

const serviceLinks = [
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact Us" },
  { to: "/account", label: "Customer Portal Demo" },
] as const;

const legalLinks = [
  { to: "/legal/$policy", params: { policy: "privacy" }, label: "Privacy Policy" },
  { to: "/legal/$policy", params: { policy: "terms" }, label: "Terms & Conditions" },
  { to: "/legal/$policy", params: { policy: "refunds" }, label: "Refund Policy" },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <img
            src="/logo.png"
            alt="JMB 2 Creations logo"
            className="w-40 rounded-3xl shadow-soft"
            loading="lazy"
          />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            A family-run shop turning big imagination into colorful 3D-printed charms,
            collectibles, cosplay creations and personalized gifts.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="JMB 2 Creations on Instagram"
              className="grid size-11 place-items-center rounded-full bg-gradient-sweet text-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <Instagram className="size-5" aria-hidden />
            </a>
            <a
              href={SOCIAL.facebook}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="JMB 2 Creations on Facebook"
              className="grid size-11 place-items-center rounded-full bg-gradient-plum text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <Facebook className="size-5" aria-hidden />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {shopLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-muted-foreground hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Customer Service</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {serviceLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-muted-foreground hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  params={link.params}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Shipping & Pickup</h3>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p className="flex gap-2">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Flat-rate shipping across the US. Most creations ship in 3–5 business days.
            </p>
            <p className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Local pickup is available. Exact pickup details are shared when an order is ready.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © 2026 JMB 2 Creations. Presentation mockup with demo data. All rights reserved.
      </div>
    </footer>
  );
}
