import type { CaseStatus } from "@/types/citytrace";

/**
 * Format an amount in Bangladeshi Taka using South Asian numbering (e.g., ৳ 4,80,00,000).
 */
export function formatBdt(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `৳ ${formatted}`;
}

/**
 * Compact BDT shorthand in Crore (Cr) or Lakh (L) for tight badges/charts.
 */
export function formatBdtCompact(amount: number): string {
  if (amount >= 10_000_000) {
    return `৳ ${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    return `৳ ${(amount / 100_000).toFixed(2)} L`;
  }
  return formatBdt(amount);
}

export interface StatusStyle {
  label: string;
  hex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotClass: string;
}

export function getStatusStyle(status: CaseStatus): StatusStyle {
  switch (status) {
    case "Unresolved":
      return {
        label: "Unresolved",
        hex: "#ef4444",
        badgeBg: "bg-red-500/15",
        badgeText: "text-red-300",
        badgeBorder: "border-red-500/40",
        dotClass: "bg-red-500 shadow-[0_0_10px_#ef4444]",
      };
    case "Delayed":
      return {
        label: "Delayed",
        hex: "#f59e0b",
        badgeBg: "bg-amber-500/15",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        dotClass: "bg-amber-400 shadow-[0_0_10px_#f59e0b]",
      };
    case "Resolved":
      return {
        label: "Resolved",
        hex: "#10b981",
        badgeBg: "bg-emerald-500/15",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        dotClass: "bg-emerald-400 shadow-[0_0_10px_#10b981]",
      };
  }
}
