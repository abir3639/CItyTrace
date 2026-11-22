"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { formatBdtCompact } from "@/utils/formatters";

/**
 * Shared chart scaffolding.
 *
 * Recharts measures its container and renders nothing during SSR, so charts
 * mount after hydration. Each one also sits inside a boundary that falls back
 * to a plain data table, so a chart failure can never leave a panel stuck.
 */

export const AXIS_STYLE = { fill: "#94a3b8", fontSize: 10 } as const;
export const GRID_STROKE = "#1e293b";
export const TOOLTIP_STYLE = {
  background: "#0b1420",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 11,
  color: "#e2e8f0",
} as const;

export const PALETTE = {
  cyan: "#22d3ee",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  slate: "#334155",
  indigo: "#818cf8",
  pink: "#f472b6",
} as const;

/** Recharts types values as ValueType | undefined, so accept unknown. */
export const formatBdtValue = (value: unknown): string =>
  formatBdtCompact(Number(value ?? 0));

export const formatDayCount = (value: unknown): string =>
  `${Number(value ?? 0)} days overdue`;

export function DataFallback({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#08101d] p-2.5">
      <p className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
        Chart unavailable · data shown as values
      </p>
      <ul className="mt-1.5 space-y-1">
        {rows.map(([label, value]) => (
          <li
            key={label}
            className="flex items-baseline justify-between gap-3 font-mono text-[10px]"
          >
            <span className="truncate text-slate-300">{label}</span>
            <span className="shrink-0 text-slate-100">{value}</span>
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
    console.error("CITYTRACE chart failed to render:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const emptySubscribe = () => () => {};

/**
 * True only after hydration. Uses an external-store read rather than an effect
 * so the server and first client render agree without a cascading update.
 */
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
    return <div className="ct-skeleton rounded-lg" style={{ height }} aria-hidden="true" />;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
