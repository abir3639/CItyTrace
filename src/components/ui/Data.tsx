import type { ReactNode } from "react";
import Link from "next/link";
import { TONES, type Tone } from "@/utils/formatters";

/* ------------------------------------------------------------------ */
/* Stat cards                                                          */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
  href?: string;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  href,
}: StatCardProps) {
  const style = TONES[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          {label}
        </p>
        {icon ? <span className={style.label}>{icon}</span> : null}
      </div>
      <p className={`mt-2 font-mono text-2xl font-bold tracking-tight ${style.text}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>
      ) : null}
    </>
  );

  const shared = `ct-panel flex flex-col rounded-xl px-4 py-3.5 transition-colors ${
    href ? "hover:border-cyan-400/50 hover:bg-[#0c182b]" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={shared} aria-label={`${label}: ${value}`}>
        {body}
      </Link>
    );
  }

  return <div className={shared}>{body}</div>;
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

interface ProgressBarProps {
  /** 0–100. */
  value: number;
  tone?: Tone;
  className?: string;
  /** Accessible description of what the bar represents. */
  label?: string;
}

export function ProgressBar({
  value,
  tone = "info",
  className = "",
  label,
}: ProgressBarProps) {
  const width = clampPercent(value);
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}
      role="img"
      aria-label={label ?? `${width.toFixed(0)} percent`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${TONES[tone].bar}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/**
 * Budget bar that makes the evidence gap visible.
 *
 * Emerald  = spend backed by independent evidence
 * Hatched  = reported spend with no verified evidence behind it
 * Empty    = unspent allocation
 */
export function SpendBar({
  allocated,
  reported,
  verified,
  height = "h-2.5",
}: {
  allocated: number;
  reported: number;
  verified?: number;
  height?: string;
}) {
  const denominator = allocated > 0 ? allocated : 1;
  const reportedPct = clampPercent((reported / denominator) * 100);
  const verifiedPct = clampPercent(((verified ?? 0) / denominator) * 100);
  const verifiedLabel =
    verified === undefined ? "no verified spend on file" : `${verifiedPct.toFixed(0)}% verified`;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-slate-800/90 ${height}`}
      role="img"
      aria-label={`Reported spend ${reportedPct.toFixed(0)}% of allocation, ${verifiedLabel}`}
    >
      <div className="ct-hatch absolute inset-y-0 left-0" style={{ width: `${reportedPct}%` }} />
      <div
        className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-400"
        style={{ width: `${verifiedPct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/30 px-6 py-12 text-center ${className}`}
    >
      {icon ? <span className="text-slate-500">{icon}</span> : null}
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Key/value rows                                                      */
/* ------------------------------------------------------------------ */

export function KeyValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">
        {label}
      </dt>
      <dd
        className={`text-right font-mono text-[11px] font-semibold ${
          tone ? TONES[tone].text : "text-slate-200"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
