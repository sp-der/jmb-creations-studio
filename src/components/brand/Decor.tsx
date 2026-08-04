import { cn } from "@/lib/utils";

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 text-lavender", className)}>
      <path
        d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Charm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-6 text-mauve", className)}>
      <circle cx="16" cy="9" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="7" y="14" width="18" height="14" rx="6" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function Cube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-6 text-periwinkle", className)}>
      <path d="M16 3l12 6.5v13L16 29 4 22.5v-13L16 3z" fill="currentColor" opacity="0.75" />
      <path d="M4 9.5L16 16l12-6.5M16 16v13" stroke="white" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function Filament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8 text-pastel", className)}>
      <circle cx="20" cy="20" r="16" fill="currentColor" />
      <circle cx="20" cy="20" r="6" fill="white" />
      <circle cx="20" cy="20" r="16" fill="none" stroke="white" strokeWidth="2" opacity="0.7" />
    </svg>
  );
}

export function StarBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5 text-pastel", className)}>
      <path
        d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6L12 1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gentle ambient decoration. Purely decorative and pointer-transparent. */
export function FloatingDecor({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Charm className="absolute left-[6%] top-[18%] size-8 animate-float-slow opacity-70" />
      <Cube className="absolute right-[9%] top-[12%] size-10 animate-float-mid opacity-60" />
      <Filament className="absolute bottom-[14%] left-[12%] size-10 animate-float-mid opacity-70" />
      <StarBurst className="absolute bottom-[22%] right-[14%] size-7 animate-float-slow opacity-70" />
      <Sparkle className="absolute left-[28%] top-[8%] animate-twinkle" />
      <Sparkle className="absolute right-[30%] bottom-[10%] size-5 animate-twinkle" />
      <Sparkle className="absolute left-[46%] bottom-[26%] size-3 animate-twinkle" />
    </div>
  );
}