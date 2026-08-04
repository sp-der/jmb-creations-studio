import type { ReactNode } from "react";

import { AnnouncementBar, Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-hero">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">{subtitle}</p>
        )}
      </div>
    </div>
  );
}