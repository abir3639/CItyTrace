"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_STYLE,
  ChartBoundary,
  ChartFrame,
  DataFallback,
  GRID_STROKE,
  PALETTE,
  TOOLTIP_STYLE,
  formatBdtValue,
} from "@/components/charts/ChartShell";
import type { TrendPoint } from "@/lib/dashboard";
import { formatBdtCompact } from "@/utils/formatters";

/* ------------------------------------------------------------------ */
/* Civic trend over time                                               */
/* ------------------------------------------------------------------ */

export function IssueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartBoundary
      fallback={
        <DataFallback
          rows={data.slice(-6).map((point) => [
            point.label,
            `${point.reported} reported · ${point.resolved} resolved`,
          ])}
        />
      }
    >
      <ChartFrame height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
          <defs>
            <linearGradient id="ct-trend-reported" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE.cyan} stopOpacity={0.55} />
              <stop offset="100%" stopColor={PALETTE.cyan} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="ct-trend-resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE.emerald} stopOpacity={0.5} />
              <stop offset="100%" stopColor={PALETTE.emerald} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} stroke={GRID_STROKE} minTickGap={22} />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
          <Area
            type="monotone"
            dataKey="reported"
            name="Issues reported"
            stroke={PALETTE.cyan}
            strokeWidth={2}
            fill="url(#ct-trend-reported)"
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Issues resolved"
            stroke={PALETTE.emerald}
            strokeWidth={2}
            fill="url(#ct-trend-resolved)"
          />
        </AreaChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Performance by category                                             */
/* ------------------------------------------------------------------ */

export interface CategoryPerformanceRow {
  category: string;
  open: number;
  resolved: number;
}

export function CategoryPerformanceChart({ data }: { data: CategoryPerformanceRow[] }) {
  return (
    <ChartBoundary
      fallback={
        <DataFallback
          rows={data.map((row) => [row.category, `${row.open} open · ${row.resolved} resolved`])}
        />
      }
    >
      <ChartFrame height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="category" tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
          <Bar dataKey="open" name="Open" fill={PALETTE.red} radius={[3, 3, 0, 0]} />
          <Bar dataKey="resolved" name="Resolved" fill={PALETTE.emerald} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Neighbourhood comparison                                            */
/* ------------------------------------------------------------------ */

export interface SectorComparisonRow {
  sector: string;
  name: string;
  open: number;
  recurring: number;
}

export function SectorComparisonChart({ data }: { data: SectorComparisonRow[] }) {
  return (
    <ChartBoundary
      fallback={
        <DataFallback
          rows={data.map((row) => [`${row.sector} ${row.name}`, `${row.open} open · ${row.recurring} recurring`])}
        />
      }
    >
      <ChartFrame height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis type="category" dataKey="sector" tick={AXIS_STYLE} stroke={GRID_STROKE} width={48} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
          <Bar dataKey="open" name="Open issues" fill={PALETTE.amber} radius={[0, 3, 3, 0]} />
          <Bar dataKey="recurring" name="Recurring sites" fill={PALETTE.indigo} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Where the money sits                                                */
/* ------------------------------------------------------------------ */

export interface SpendSplitRow {
  label: string;
  value: number;
  fill: string;
}

export function SpendSplitChart({ data }: { data: SpendSplitRow[] }) {
  return (
    <ChartBoundary
      fallback={<DataFallback rows={data.map((row) => [row.label, formatBdtCompact(row.value)])} />}
    >
      <ChartFrame height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
            stroke="#060b14"
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatBdtValue} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
        </PieChart>
      </ChartFrame>
    </ChartBoundary>
  );
}
