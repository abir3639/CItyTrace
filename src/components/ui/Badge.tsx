import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { TONES, type Tone } from "@/utils/formatters";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** Leading status dot. */
  dot?: boolean;
  className?: string;
  title?: string;
}

/** Minimal status pill toned by the shared Apple semantic palette. */
export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
  title,
}: BadgeProps) {
  const style = TONES[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${style.badge} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> : null}
      {children}
    </span>
  );
}

/** Subtle disclosure pill marking simulated demonstration records. */
export function DemoBadge({
  className = "",
  label = "Demo data",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      title="All records, figures and authorities in CityTrace are fictional demonstration data."
      className={`inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.04] px-2.5 py-0.5 text-[11.5px] font-medium text-[#6E6E73] whitespace-nowrap ${className}`}
    >
      <Info className="h-3 w-3 text-[#86868B]" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Bare status dot for dense rows. */
export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${TONES[tone].dot}`} />;
}
