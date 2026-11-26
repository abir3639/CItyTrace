"use client";

import { useRouter } from "next/navigation";
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
  LEGEND_STYLE,
  PALETTE,
  TOOLTIP_STYLE,
  formatBdtValue,
} from "@/components/charts/ChartShell";
import type { TrendPoint } from "@/lib/dashboard";
import { formatBdtCompact } from "@/utils/formatters";

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
              <stop offset="0%" stopColor={PALETTE.blue} stopOpacity={0.22} />
              <stop offset="100%" stopColor={PALETTE.blue} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="ct-trend-resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE.green} stopOpacity={0.22} />
              <stop offset="100%" stopColor={PALETTE.green} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_STYLE} stroke={GRID_STROKE} minTickGap={22} />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Area
            type="monotone"
            dataKey="reported"
            name="Issues reported"
            stroke={PALETTE.blue}
            strokeWidth={2.2}
            fill="url(#ct-trend-reported)"
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Issues resolved"
            stroke={PALETTE.green}
            strokeWidth={2.2}
            fill="url(#ct-trend-resolved)"
          />
        </AreaChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

export interface CategoryPerformanceRow {
  categoryId?: string;
  category: string;
  open: number;
  resolved: number;
}

export function CategoryPerformanceChart({ data }: { data: CategoryPerformanceRow[] }) {
  const router = useRouter();

  const onBarClick = (_entry: unknown, index: number) => {
    const id = data[index]?.categoryId;
    if (id) router.push(`/civic-issues?category=${id}`);
  };

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
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Bar
            dataKey="open"
            name="Open"
            fill={PALETTE.orange}
            radius={[6, 6, 0, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
          <Bar
            dataKey="resolved"
            name="Resolved"
            fill={PALETTE.green}
            radius={[6, 6, 0, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

export interface SectorComparisonRow {
  sector: string;
  name: string;
  open: number;
  recurring: number;
}

export function SectorComparisonChart({ data }: { data: SectorComparisonRow[] }) {
  const router = useRouter();

  const onBarClick = (_entry: unknown, index: number) => {
    const sector = data[index]?.sector;
    if (sector) router.push(`/civic-issues?sector=${sector}`);
  };

  return (
    <ChartBoundary
      fallback={
        <DataFallback
          rows={data.map((row) => [
            `${row.sector} ${row.name}`,
            `${row.open} open · ${row.recurring} recurring`,
          ])}
        />
      }
    >
      <ChartFrame height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis type="category" dataKey="sector" tick={AXIS_STYLE} stroke={GRID_STROKE} width={48} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Bar
            dataKey="open"
            name="Open issues"
            fill={PALETTE.blue}
            radius={[0, 6, 6, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
          <Bar
            dataKey="recurring"
            name="Recurring sites"
            fill={PALETTE.orange}
            radius={[0, 6, 6, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

export interface SpendSplitRow {
  label: string;
  value: number;
  fill: string;
}

export function SpendSplitChart({ data }: { data: SpendSplitRow[] }) {
  const router = useRouter();

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
            innerRadius={54}
            outerRadius={88}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
            cursor="pointer"
            onClick={() => router.push("/money-tracker")}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatBdtValue} />
          <Legend wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ChartFrame>
    </ChartBoundary>
  );
}
