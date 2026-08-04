import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = [
  "from-[oklch(0.93_0.04_350)] to-[oklch(0.88_0.06_300)]",
  "from-[oklch(0.92_0.05_320)] to-[oklch(0.86_0.07_285)]",
  "from-[oklch(0.94_0.03_300)] to-[oklch(0.87_0.06_340)]",
  "from-[oklch(0.91_0.05_290)] to-[oklch(0.89_0.05_355)]",
];

type Props = {
  label?: string;
  seed?: number;
  className?: string;
  compact?: boolean;
};

/**
 * Polished placeholder that marks exactly where a real product photo will go.
 * Intentionally not a stock photo or AI product render.
 */
export function ProductPlaceholder({ label, seed = 0, className, compact = false }: Props) {
  const tone = TONES[Math.abs(seed) % TONES.length];

  return (
    <div
      role="img"
      aria-label={
        label
          ? `Product photo placeholder for ${label}`
          : "Product photo placeholder — client photo goes here"
      }
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br text-center",
        tone,
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.85) 0 2px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.6) 0 3px, transparent 3px)",
          backgroundSize: "44px 44px, 66px 66px",
        }}
      />
      <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-white/30 blur-xl" />
      <div
        aria-hidden
        className="absolute -bottom-8 -left-4 size-28 rounded-full bg-[oklch(0.62_0.113_288)]/20 blur-xl"
      />
      <div className="relative flex flex-col items-center gap-2 px-4">
        <span className="grid size-10 place-items-center rounded-2xl bg-white/70 text-primary shadow-soft">
          <Camera className="size-5" aria-hidden />
        </span>
        {!compact && (
          <>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary/80">
              Photo placeholder
            </span>
            {label && (
              <span className="line-clamp-2 max-w-[16rem] text-sm font-semibold text-foreground/70">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}