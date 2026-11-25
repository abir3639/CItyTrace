"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { formatBdtCompact } from "@/utils/formatters";

/**
 * Shared light-mode chart scaffolding.
 *
 * Recharts measures its container and renders after hydration. Every chart sits
 * inside an error boundary that falls back to a clean value list.
 */

export const AXIS_STYLE = { fill: "#6E6E73", fontSize: 11 } as const;
export const GRID_STROKE = "#E8EAEE";
export const LEGEND_STYLE = { fontSize: 11, color: "#6E6E73" } as const;
export const TOOLTIP_STYLE = {
  background: "rgba(255, 255, 255, 0.94)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(0, 0, 0, 0.08)",
  borderRadius: 14,
  boxShadow: "0 8px 24px -6px rgba(15, 23, 42, 0.12)",
  fontSize: 12,
  color: "#1D1D1F",
} as const;

export const PALETTE = {
  orange: "#FF9500",
  amber: "#FF9500",
  blue: "#007AFF",
  cyan: "#007AFF",
  green: "#34C759",
  emerald: "#34C759",
} as const;

export const GRAPH_COLORS = [
  PALETTE.orange,
  PALETTE.blue,
  PALETTE.green,
] as const;

export const formatBdtValue = (value: unknown): string =>
  formatBdtCompact(Number(value ?? 0));

export const formatDayCount = (value: unknown): string =>
  `${Number(value ?? 0)} days overdue`;

export function DataFallback({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="ct-surface-inset rounded-[14px] p-3">
      <p className="text-[11px] font-medium text-[#6E6E73]">
        Chart unavailable — values shown below
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map(([label, value]) => (
          <li
            key={label}
            className="flex items-baseline justify-between gap-3 text-[12px]"
          >
            <span className="truncate text-[#48484A]">{label}</span>
            <span className="shrink-0 font-semibold text-[#1D1D1F] tabular-nums">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export class ChartBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("CityTrace chart failed to render:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ChartFrame({ height, children }: { height: number; children: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) {
    return <div className="ct-skeleton rounded-2xl" style={{ height }} aria-hidden="true" />;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
