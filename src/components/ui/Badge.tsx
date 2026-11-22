import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { TONES, type Tone } from "@/utils/formatters";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** Leading status dot. */
  dot?: boolean;
  className?: string;
  title?: string;
}

/** Compact status pill, toned by the shared colour vocabulary. */
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap ${style.badge} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> : null}
      {children}
    </span>
  );
}

/** The amber "this is fictional data" marker required throughout the app. */
export function DemoBadge({
  className = "",
  label = "SIMULATED DEMO DATA",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      title="All records, figures and authorities in CITYTRACE are fictional demonstration data."
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-amber-200 ${className}`}
    >
      <ShieldAlert className="h-3 w-3" />
      {label}
    </span>
  );
}

/** Bare status dot for dense rows. */
export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${TONES[tone].dot}`} />;
}
