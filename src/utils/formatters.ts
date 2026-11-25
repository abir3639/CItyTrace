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
/* Tones — Apple-inspired semantic light palette                       */
/* ------------------------------------------------------------------ */

export type Tone = "danger" | "warn" | "ok" | "info" | "neutral";

export interface ToneStyle {
  /** Raw hex for the 3D scene and inline chart styles. */
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
    hex: "#FF3B30",
    label: "text-[#C9241B]",
    text: "text-[#C9241B]",
    badge: "border-[#FF3B30]/20 bg-[#FF3B30]/[0.09] text-[#C9241B]",
    dot: "bg-[#FF3B30]",
    bar: "bg-[#FF3B30]",
    ring: "border-[#FF3B30]/35 bg-white/95 text-[#1D1D1F] shadow-[0_6px_18px_-4px_rgba(255,59,48,0.28)]",
  },
  warn: {
    hex: "#FF9500",
    label: "text-[#B25000]",
    text: "text-[#B25000]",
    badge: "border-[#FF9500]/25 bg-[#FF9500]/[0.11] text-[#B25000]",
    dot: "bg-[#FF9500]",
    bar: "bg-[#FF9500]",
    ring: "border-[#FF9500]/40 bg-white/95 text-[#1D1D1F] shadow-[0_6px_18px_-4px_rgba(255,149,0,0.28)]",
  },
  ok: {
    hex: "#34C759",
    label: "text-[#1A7F37]",
    text: "text-[#1A7F37]",
    badge: "border-[#34C759]/25 bg-[#34C759]/[0.11] text-[#1A7F37]",
    dot: "bg-[#34C759]",
    bar: "bg-[#34C759]",
    ring: "border-[#34C759]/40 bg-white/95 text-[#1D1D1F] shadow-[0_6px_18px_-4px_rgba(52,199,89,0.25)]",
  },
  info: {
    hex: "#007AFF",
    label: "text-[#0055CC]",
    text: "text-[#0055CC]",
    badge: "border-[#007AFF]/20 bg-[#007AFF]/[0.09] text-[#0055CC]",
    dot: "bg-[#007AFF]",
    bar: "bg-[#007AFF]",
    ring: "border-[#007AFF]/35 bg-white/95 text-[#1D1D1F] shadow-[0_6px_18px_-4px_rgba(0,122,255,0.25)]",
  },
  neutral: {
    hex: "#86868B",
    label: "text-[#6E6E73]",
    text: "text-[#1D1D1F]",
    badge: "border-black/[0.08] bg-black/[0.045] text-[#48484A]",
    dot: "bg-[#86868B]",
    bar: "bg-[#86868B]",
    ring: "border-black/15 bg-white/95 text-[#1D1D1F] shadow-md",
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
