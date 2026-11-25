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
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#6E6E73]">{label}</p>
        {icon ? (
          <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#F5F5F7] ${style.label}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 text-[28px] font-semibold tracking-[-0.03em] leading-none text-[#1D1D1F] tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] leading-snug text-[#6E6E73]">{hint}</p>
      ) : null}
    </>
  );

  const shared = `ct-surface flex flex-col rounded-[20px] p-5 transition-all duration-200 ${
    href
      ? "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.16)] active:scale-[0.99]"
      : ""
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
      className={`h-2 w-full overflow-hidden rounded-full bg-black/[0.06] ${className}`}
      role="img"
      aria-label={label ?? `${width.toFixed(0)} percent`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${TONES[tone].bar}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/**
 * Budget bar that makes the evidence gap visible.
 *
 * Green   = spend backed by independent evidence
 * Hatched = reported spend with no verified evidence behind it
 * Empty   = unspent allocation
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
      className={`relative w-full overflow-hidden rounded-full bg-[#E9ECF0] ${height}`}
      role="img"
      aria-label={`Reported spend ${reportedPct.toFixed(0)}% of allocation, ${verifiedLabel}`}
    >
      <div className="ct-hatch absolute inset-y-0 left-0" style={{ width: `${reportedPct}%` }} />
      <div
        className="absolute inset-y-0 left-0 rounded-l-full bg-[#34C759]"
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
      className={`flex flex-col items-center justify-center gap-3 rounded-[18px] border border-black/[0.06] bg-[#F5F5F7]/70 px-6 py-10 text-center ${className}`}
    >
      {icon ? <span className="text-[#86868B]">{icon}</span> : null}
      <div>
        <p className="text-[14px] font-semibold text-[#1D1D1F]">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-[#6E6E73]">
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
    <div className="flex items-baseline justify-between gap-3 border-b border-black/[0.045] py-2 last:border-0">
      <dt className="text-[12.5px] text-[#6E6E73]">{label}</dt>
      <dd
        className={`text-right text-[13px] font-medium tabular-nums ${
          tone ? TONES[tone].text : "text-[#1D1D1F]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
