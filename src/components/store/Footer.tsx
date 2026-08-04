import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, MapPin, Truck } from "lucide-react";

import logo from "@/assets/jmb-logo.png.asset.json";
import { SOCIAL } from "@/data/catalog";

const shopLinks = [
  { to: "/shop", label: "All Creations" },
  { to: "/categories", label: "Shop by Category" },
  { to: "/shop", label: "New Arrivals" },
  { to: "/shop", label: "Seasonal Drops" },
];

const serviceLinks = [
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact Us" },
  { to: "/account", label: "My Account" },
  { to: "/account", label: "Track My Order" },
];

const legalLinks = [
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/terms", label: "Terms & Conditions" },
  { to: "/legal/refunds", label: "Refund Policy" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <img
            src={logo.url}
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
            {shopLinks.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/custom-orders" className="font-semibold text-primary hover:underline">
                Request a Custom Item
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">Customer Service</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {serviceLinks.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-2 text-sm">
            {legalLinks.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-muted-foreground hover:text-foreground">
                  {l.label}
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
              Free local pickup on selected days and time windows — details are sent when your
              order is marked Ready for Pickup.
            </p>
          </div>
          <Link
            to="/admin"
            className="mt-4 inline-block text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Store owner login
          </Link>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} JMB 2 Creations. All rights reserved. · Website mockup with
        demo products and sample data.
      </div>
    </footer>
  );
}