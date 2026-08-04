import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/custom-orders", label: "Custom Orders" },
  { to: "/about", label: "About Us" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function AnnouncementBar() {
  return (
    <div className="bg-gradient-plum px-4 py-2 text-center text-xs font-semibold tracking-wide text-primary-foreground sm:text-sm">
      Custom orders are open • Shipping and local pickup available
    </div>
  );
}

export function Navbar() {
  const { count } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1 sm:px-6">
        <Link
  to="/"
  className="flex h-16 w-28 shrink-0 items-center overflow-hidden sm:h-[72px] sm:w-32"
  aria-label="JMB 2 Creations home"
>
  <img
    src="/logoheader.png"
    alt="JMB 2 Creations logo"
    className="h-full w-full scale-[1.35] object-contain"
  />
</Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "bg-secondary/70 text-foreground" }}
              className="rounded-full px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search creations"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search />
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Your account">
            <Link to="/account">
              <UserRound />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label={`Cart, ${count} items`}>
            <Link to="/cart" className="relative">
              <ShoppingBag />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm border-l-border bg-background">
              <SheetTitle className="font-display text-xl">Browse</SheetTitle>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    activeOptions={{ exact: link.to === "/" }}
                    activeProps={{ className: "bg-secondary/70" }}
                    className="rounded-2xl px-4 py-3 text-base font-semibold text-foreground transition-colors hover:bg-secondary/50"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 grid gap-2">
                <Button variant="hero" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/shop">Shop All Creations</Link>
                </Button>
                <Button variant="soft" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/custom-orders">Request a Custom Item</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border/70 bg-card/90 px-4 py-3 sm:px-6">
          <form
            className="mx-auto flex max-w-3xl items-center gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="nav-search" className="sr-only">
              Search creations
            </label>
            <Input
              id="nav-search"
              placeholder="Search charms, toppers, keychains…"
              className="h-11 rounded-full"
            />
            <Button type="submit" variant="hero" asChild>
              <Link to="/shop" onClick={() => setSearchOpen(false)}>
                Search
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            >
              <X />
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}