"use client";

import { useRouter } from "next/navigation";
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
  GRAPH_COLORS,
  GRID_STROKE,
  LEGEND_STYLE,
  PALETTE,
  TOOLTIP_STYLE,
  formatBdtValue,
  formatDayCount,
} from "@/components/charts/ChartShell";
import { formatBdt, formatBdtCompact } from "@/utils/formatters";

const SPEND_COLORS = {
  allocated: PALETTE.blue,
  reported: PALETTE.orange,
  verified: PALETTE.green,
} as const;

const STATUS_COLORS: Record<string, string> = {
  Completed: PALETTE.green,
  Active: PALETTE.blue,
  Planned: PALETTE.blue,
  Delayed: PALETTE.orange,
  Stalled: PALETTE.orange,
};

const CATEGORY_COLORS = GRAPH_COLORS;

export interface SpendRow {
  projectId?: string;
  code: string;
  name: string;
  allocated: number;
  reported: number;
  verified: number;
}

export function SpendComparisonChart({ data }: { data: SpendRow[] }) {
  const router = useRouter();

  const onBarClick = (_entry: unknown, index: number) => {
    const id = data[index]?.projectId;
    if (id) router.push(`/public-projects/${id}`);
  };

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
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Bar
            dataKey="allocated"
            name="Allocated"
            fill={SPEND_COLORS.allocated}
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
          <Bar
            dataKey="reported"
            name="Reported"
            fill={SPEND_COLORS.reported}
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
          <Bar
            dataKey="verified"
            name="Verified"
            fill={SPEND_COLORS.verified}
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={onBarClick}
          />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

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
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                fillOpacity={index < CATEGORY_COLORS.length ? 1 : 0.62}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatBdtValue} />
          <Legend wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

export interface StatusRow {
  statusKey?: string;
  status: string;
  count: number;
}

export function ProjectStatusChart({ data }: { data: StatusRow[] }) {
  const router = useRouter();

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
          <Bar
            dataKey="count"
            name="Projects"
            radius={[6, 6, 0, 0]}
            cursor="pointer"
            onClick={(_entry, index: number) => {
              const key = data[index]?.statusKey;
              if (key) router.push(`/public-projects?status=${key}`);
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? PALETTE.blue}
                fillOpacity={
                  entry.status === "Planned" ? 0.6 : entry.status === "Delayed" ? 0.72 : 1
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

export interface OverdueRow {
  projectId?: string;
  code: string;
  name: string;
  days: number;
}

export function OverdueDaysChart({ data }: { data: OverdueRow[] }) {
  const router = useRouter();

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
          <Bar
            dataKey="days"
            name="Days overdue"
            fill={PALETTE.amber}
            radius={[0, 6, 6, 0]}
            cursor="pointer"
            onClick={(_entry, index: number) => {
              const id = data[index]?.projectId;
              if (id) router.push(`/public-projects/${id}`);
            }}
          />
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}

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
          <Bar dataKey="value" name="BDT" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </ChartBoundary>
  );
}
