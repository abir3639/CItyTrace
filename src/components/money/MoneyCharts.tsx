"use client";

import {
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
  TOOLTIP_STYLE,
  formatBdtValue,
  formatDayCount,
} from "@/components/charts/ChartShell";
import { formatBdt, formatBdtCompact } from "@/utils/formatters";

/**
 * Budget visualisations.
 *
 * Charts mount after hydration (Recharts measures its container and renders
 * nothing during SSR) and sit inside a boundary that falls back to a data table
 * if rendering fails.
 */

const SPEND_COLORS = {
  allocated: "#334155",
  reported: "#22d3ee",
  verified: "#10b981",
} as const;

const STATUS_COLORS: Record<string, string> = {
  Completed: "#10b981",
  Active: "#22d3ee",
  Planned: "#64748b",
  Delayed: "#f59e0b",
  Stalled: "#ef4444",
};

const CATEGORY_COLORS = [
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#818cf8",
  "#f472b6",
];

/* ------------------------------------------------------------------ */
/* Allocation vs reported vs verified, per project                     */
/* ------------------------------------------------------------------ */

export interface SpendRow {
  code: string;
  name: string;
  allocated: number;
  reported: number;
  verified: number;
}

export function SpendComparisonChart({ data }: { data: SpendRow[] }) {
  return (
    <ChartBoundary
      fallback={
        <DataFallback
          rows={data.map((row) => [
            `${row.code} ${row.name}`,
            `${formatBdtCompact(row.reported)} of ${formatBdtCompact(row.allocated)}`,
          ])}
        />
      }
    >
      <ChartFrame height={Math.max(240, data.length * 34 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_STYLE}
            stroke={GRID_STROKE}
            tickFormatter={(value: number) => formatBdtCompact(value)}
          />
          <YAxis type="category" dataKey="code" tick={AXIS_STYLE} stroke={GRID_STROKE} width={72} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatBdtValue} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
          <Bar dataKey="allocated" name="Allocated" fill={SPEND_COLORS.allocated} radius={[0, 3, 3, 0]} />
          <Bar dataKey="reported" name="Reported" fill={SPEND_COLORS.reported} radius={[0, 3, 3, 0]} />
          <Bar dataKey="verified" name="Verified" fill={SPEND_COLORS.verified} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Allocation by category                                              */
/* ------------------------------------------------------------------ */

export interface CategoryRow {
  label: string;
  allocated: number;
  reported: number;
}

export function CategoryBudgetChart({ data }: { data: CategoryRow[] }) {
  return (
    <ChartBoundary
      fallback={
        <DataFallback
          rows={data.map((row) => [row.label, formatBdt(row.allocated)])}
        />
      }
    >
      <ChartFrame height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="allocated"
            nameKey="label"
            innerRadius={54}
            outerRadius={92}
            paddingAngle={2}
            stroke="#060b14"
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatBdtValue} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
        </PieChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery status across projects                                     */
/* ------------------------------------------------------------------ */

export interface StatusRow {
  status: string;
  count: number;
}

export function ProjectStatusChart({ data }: { data: StatusRow[] }) {
  return (
    <ChartBoundary
      fallback={
        <DataFallback rows={data.map((row) => [row.status, `${row.count} projects`])} />
      }
    >
      <ChartFrame height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="status" tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#64748b"} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Overdue days for delayed projects                                   */
/* ------------------------------------------------------------------ */

export interface OverdueRow {
  code: string;
  name: string;
  days: number;
}

export function OverdueDaysChart({ data }: { data: OverdueRow[] }) {
  return (
    <ChartBoundary
      fallback={<DataFallback rows={data.map((row) => [row.code, `${row.days} days late`])} />}
    >
      <ChartFrame height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} stroke={GRID_STROKE} unit="d" />
          <YAxis type="category" dataKey="code" tick={AXIS_STYLE} stroke={GRID_STROKE} width={72} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatDayCount} />
          <Bar dataKey="days" name="Days overdue" fill="#f59e0b" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

/* ------------------------------------------------------------------ */
/* Single project: where the money claim sits                          */
/* ------------------------------------------------------------------ */

export function ProjectSpendChart({
  allocated,
  reported,
  verified,
}: {
  allocated: number;
  reported: number;
  verified?: number;
}) {
  const data = [
    { label: "Allocated", value: allocated, fill: SPEND_COLORS.allocated },
    { label: "Reported", value: reported, fill: SPEND_COLORS.reported },
    { label: "Verified", value: verified ?? 0, fill: SPEND_COLORS.verified },
  ];

  return (
    <ChartBoundary
      fallback={<DataFallback rows={data.map((row) => [row.label, formatBdt(row.value)])} />}
    >
      <ChartFrame height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis
            tick={AXIS_STYLE}
            stroke={GRID_STROKE}
            tickFormatter={(value: number) => formatBdtCompact(value)}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatBdtValue} />
          <Bar dataKey="value" name="BDT" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}
