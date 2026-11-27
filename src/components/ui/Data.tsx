import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TONES, type Tone } from "@/utils/formatters";

/* ------------------------------------------------------------------ */
/* Stat cards                                                          */
/* ------------------------------------------------------------------ */

const ICON_WELL: Record<Tone, string> = {
  danger: "bg-[#FF3B30]/[0.09] ring-1 ring-[#FF3B30]/15",
  warn: "bg-[#FF9500]/[0.10] ring-1 ring-[#FF9500]/15",
  ok: "bg-[#34C759]/[0.10] ring-1 ring-[#34C759]/15",
  info: "bg-[#007AFF]/[0.09] ring-1 ring-[#007AFF]/15",
  purple: "bg-[#AF52DE]/[0.10] ring-1 ring-[#AF52DE]/15",
  neutral: "bg-[#F0F2F5] ring-1 ring-black/[0.05]",
};

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
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ICON_WELL[tone]} ${style.label}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 text-[28px] font-semibold tracking-[-0.03em] leading-none text-[#1D1D1F] tabular-nums">
        {value}
      </p>
      {hint ? (
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-[12px] leading-snug text-[#6E6E73]">{hint}</p>
          {href ? (
            <ArrowUpRight
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 translate-y-0.5 -translate-x-0.5 text-[#007AFF] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
            />
          ) : null}
        </div>
      ) : null}
    </>
  );

  const shared = `ct-surface flex flex-col rounded-[20px] p-5 ${
    href ? "group ct-card-interactive" : ""
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
