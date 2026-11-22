import type {
  IssueStatus,
  MapFeatureState,
  ProjectStatus,
  Severity,
} from "@/types/citytrace";

/* ------------------------------------------------------------------ */
/* Currency — Bangladeshi Taka, South Asian grouping                   */
/* ------------------------------------------------------------------ */

/**
 * Formats an amount in Taka using South Asian numbering, e.g. ৳ 4,80,00,000.
 */
export function formatBdt(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `৳ ${formatted}`;
}

/** Compact BDT shorthand in Crore (Cr) or Lakh (L) for tight badges. */
export function formatBdtCompact(amount: number): string {
  if (amount >= 10_000_000) {
    return `৳ ${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    return `৳ ${(amount / 100_000).toFixed(2)} L`;
  }
  return formatBdt(amount);
}

/** Percentage with one decimal, clamped to a sensible range. */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Formats an ISO date (YYYY-MM-DD) as "4 Jul 2025".
 * UTC is pinned so date-only strings never shift by a day.
 */
export function formatDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return DATE_FORMATTER.format(parsed);
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Tones — the single colour vocabulary of the design system           */
/* ------------------------------------------------------------------ */

export type Tone = "danger" | "warn" | "ok" | "info" | "neutral";

export interface ToneStyle {
  /** Raw hex for the 3D scene and inline styles. */
  hex: string;
  label: string;
  text: string;
  badge: string;
  dot: string;
  bar: string;
  ring: string;
}

export const TONES: Record<Tone, ToneStyle> = {
  danger: {
    hex: "#ef4444",
    label: "text-red-300",
    text: "text-red-200",
    badge: "border-red-500/40 bg-red-500/15 text-red-200",
    dot: "bg-red-500 shadow-[0_0_10px_#ef4444]",
    bar: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]",
    ring: "border-red-400/70 bg-red-950/90 text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.45)]",
  },
  warn: {
    hex: "#f59e0b",
    label: "text-amber-300",
    text: "text-amber-200",
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    dot: "bg-amber-400 shadow-[0_0_10px_#f59e0b]",
    bar: "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]",
    ring: "border-amber-400/70 bg-amber-950/90 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.45)]",
  },
  ok: {
    hex: "#10b981",
    label: "text-emerald-300",
    text: "text-emerald-200",
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400 shadow-[0_0_10px_#10b981]",
    bar: "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    ring: "border-emerald-400/70 bg-emerald-950/90 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.45)]",
  },
  info: {
    hex: "#22d3ee",
    label: "text-cyan-300",
    text: "text-cyan-200",
    badge: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
    dot: "bg-cyan-400 shadow-[0_0_10px_#22d3ee]",
    bar: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
    ring: "border-cyan-400/70 bg-cyan-950/90 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.45)]",
  },
  neutral: {
    hex: "#94a3b8",
    label: "text-slate-300",
    text: "text-slate-200",
    badge: "border-slate-600/60 bg-slate-500/15 text-slate-200",
    dot: "bg-slate-400",
    bar: "bg-slate-500",
    ring: "border-slate-500/70 bg-slate-900/90 text-slate-100",
  },
};

export function toneStyle(tone: Tone): ToneStyle {
  return TONES[tone];
}

/* ------------------------------------------------------------------ */
/* Status → tone, shared by every module                               */
/* ------------------------------------------------------------------ */

export function issueStatusTone(status: IssueStatus): Tone {
  switch (status) {
    case "resolved":
      return "ok";
    case "reopened":
    case "reported":
      return "danger";
    case "under-review":
      return "warn";
    case "in-progress":
      return "info";
  }
}

export function projectStatusTone(status: ProjectStatus): Tone {
  switch (status) {
    case "completed":
      return "ok";
    case "active":
      return "info";
    case "delayed":
      return "warn";
    case "stalled":
      return "danger";
    case "planned":
      return "neutral";
  }
}

export function severityTone(severity: Severity): Tone {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warn";
    case "moderate":
      return "info";
    case "low":
      return "neutral";
  }
}

/**
 * Marker tone in the 3D explorer.
 * Green = active or verified completed, amber = delayed, red = unresolved.
 */
export function mapFeatureTone(state: MapFeatureState): Tone {
  switch (state) {
    case "unresolved":
      return "danger";
    case "delayed":
      return "warn";
    case "active":
    case "completed":
      return "ok";
  }
}
