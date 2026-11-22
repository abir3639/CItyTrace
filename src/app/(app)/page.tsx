import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Coins,
  FileWarning,
  Filter,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { KeyValue, ProgressBar, SpendBar, StatCard } from "@/components/ui/Data";
import {
  CategoryPerformanceChart,
  IssueTrendChart,
  SectorComparisonChart,
  SpendSplitChart,
} from "@/components/dashboard/DashboardCharts";
import FindingsFeed from "@/components/ai/FindingsFeed";
import { PROJECTS, SECTORS } from "@/data";
import { findAnomalies } from "@/lib/anomalies";
import {
  PERIOD_OPTIONS,
  applyIssueAttributes,
  applyIssuePeriod,
  applyProjectAttributes,
  buildTrend,
  periodStart,
  type PeriodKey,
} from "@/lib/dashboard";
import { listIssues } from "@/lib/issue-store";
import {
  getActivityFeed,
  getBudgetTotals,
  getCategoryStats,
  getEvidenceCoverage,
  getProjectOverdueDays,
  getRecurringProblems,
  getSectorStats,
} from "@/lib/stats";
import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  ISSUE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type IssueCategory,
} from "@/types/citytrace";
import {
  TONES,
  formatBdt,
  formatBdtCompact,
  formatDate,
  formatPercent,
  issueStatusTone,
  projectStatusTone,
} from "@/utils/formatters";

export const metadata: Metadata = {
  title: "Overview · CITYTRACE",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function buildHref(params: SearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = asString(value);
    if (single) search.set(key, single);
  }
  const query = search.toString();
  return query ? `/?${query}` : "/";
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
        active
          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
          : "border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const periodParam = asString(params.period);
  const sectorParam = asString(params.sector);
  const categoryParam = asString(params.category);

  const period: PeriodKey = PERIOD_OPTIONS.some((option) => option.key === periodParam)
    ? (periodParam as PeriodKey)
    : "all";
  const sectorId = SECTORS.some((item) => item.id === sectorParam) ? sectorParam : undefined;
  const category = ISSUE_CATEGORIES.includes(categoryParam as IssueCategory)
    ? (categoryParam as IssueCategory)
    : undefined;

  const hasFilters = period !== "all" || Boolean(sectorId) || Boolean(category);

  /* ------------------------------ Data ------------------------------- */
  const allIssues = listIssues();
  const scopedIssues = applyIssueAttributes(allIssues, { sectorId, category });
  const windowedIssues = applyIssuePeriod(scopedIssues, period);
  const scopedProjects = applyProjectAttributes(PROJECTS, { sectorId, category });

  const openIssues = scopedIssues.filter((issue) => issue.status !== "resolved").length;
  const resolvedIssues = scopedIssues.length - openIssues;
  const recurring = getRecurringProblems(scopedIssues);
  const activeProjects = scopedProjects.filter((project) => project.status === "active").length;
  const delayedProjects = scopedProjects.filter(
    (project) => project.status === "delayed" || project.status === "stalled"
  ).length;

  const budgets = getBudgetTotals(scopedProjects);
  const evidence = getEvidenceCoverage(scopedIssues);
  const categories = getCategoryStats(scopedIssues);
  const sectors = getSectorStats(scopedIssues);
  const trend = buildTrend(windowedIssues, periodStart(period));
  const activity = getActivityFeed(windowedIssues).slice(0, 6);
  const findings = findAnomalies(scopedIssues);

  const unspent = Math.max(0, budgets.allocatedBdt - budgets.reportedBdt);
  const spendSplit = [
    { label: "Verified spend", value: budgets.verifiedBdt, fill: "#10b981" },
    { label: "Reported, unverified", value: budgets.unverifiedBdt, fill: "#f59e0b" },
    { label: "Unspent", value: unspent, fill: "#334155" },
  ];

  const categoryRows = categories.map((row) => ({
    category: CATEGORY_LABELS[row.category],
    open: row.openIssues,
    resolved: row.issueCount - row.openIssues,
  }));

  const sectorRows = sectors.map((row) => ({
    sector: row.sector.code,
    name: row.sector.name,
    open: row.openIssues,
    recurring: row.recurringClusters,
  }));

  const maxSectorOpen = Math.max(...sectors.map((row) => row.openIssues), 1);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Transparency Dashboard"
        title="Dhaka Sector 04 — district civic health"
        description={`Every figure here is computed from ${allIssues.length} civic records and ${PROJECTS.length} sanctioned works. Nothing on this page is typed in by hand.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 font-mono text-[10px] text-slate-300">
              Snapshot · 22 Jul 2025
            </span>
            <Link
              href="/city-explorer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
            >
              <MapIcon className="h-3.5 w-3.5" />
              City Explorer
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <Panel className="flex flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PanelHeader
            title="Scope"
            description="Attribute filters narrow every figure. The period filter narrows what happened — not today's standing."
            icon={<Filter className="h-3.5 w-3.5" />}
          />
          {hasFilters ? (
            <Link href="/" className="font-mono text-[10px] text-cyan-300 hover:text-cyan-200">
              Reset all
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 shrink-0 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
            Period
          </span>
          {PERIOD_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              href={buildHref({
                period: option.key === "all" ? undefined : option.key,
                sector: sectorParam,
                category: categoryParam,
              })}
              active={period === option.key}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 shrink-0 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
            Sector
          </span>
          <Chip
            href={buildHref({
              period: period === "all" ? undefined : period,
              category: categoryParam,
            })}
            active={!sectorId}
          >
            All
          </Chip>
          {SECTORS.map((item) => (
            <Chip
              key={item.id}
              href={buildHref({
                period: period === "all" ? undefined : period,
                sector: item.id,
                category: categoryParam,
              })}
              active={sectorId === item.id}
            >
              {item.code}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-14 shrink-0 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
            Category
          </span>
          <Chip
            href={buildHref({
              period: period === "all" ? undefined : period,
              sector: sectorParam,
            })}
            active={!category}
          >
            All
          </Chip>
          {ISSUE_CATEGORIES.map((value) => (
            <Chip
              key={value}
              href={buildHref({
                period: period === "all" ? undefined : period,
                sector: sectorParam,
                category: value,
              })}
              active={category === value}
            >
              {CATEGORY_LABELS[value]}
            </Chip>
          ))}
        </div>
      </Panel>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Open civic issues"
          value={String(openIssues)}
          hint={`${scopedIssues.length} records in scope · ${resolvedIssues} resolved and kept on file`}
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/civic-issues"
        />
        <StatCard
          label="Resolved issues"
          value={String(resolvedIssues)}
          hint="Closed reports that remain permanently visible"
          tone="ok"
          icon={<ShieldCheck className="h-4 w-4" />}
          href="/civic-issues?status=resolved"
        />
        <StatCard
          label="Recurring problem sites"
          value={String(recurring.length)}
          hint="Locations with more than one report on file"
          tone="warn"
          icon={<TrendingUp className="h-4 w-4" />}
          href="/civic-issues"
        />
        <StatCard
          label="Active projects"
          value={String(activeProjects)}
          hint={`${scopedProjects.length} sanctioned works in scope`}
          tone="info"
          icon={<Coins className="h-4 w-4" />}
          href="/public-projects?status=active"
        />
        <StatCard
          label="Delayed or stalled"
          value={String(delayedProjects)}
          hint="Past the contracted completion date"
          tone="warn"
          icon={<CalendarClock className="h-4 w-4" />}
          href="/public-projects?status=delayed"
        />
        <StatCard
          label="Reported public spend"
          value={formatBdtCompact(budgets.reportedBdt)}
          hint={`${formatBdtCompact(budgets.verifiedBdt)} verified · ${formatBdtCompact(budgets.unverifiedBdt)} unverified`}
          tone="info"
          icon={<Wallet className="h-4 w-4" />}
          href="/money-tracker"
        />
      </div>

      {/* Trend + money split */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="flex flex-col gap-3 p-4 xl:col-span-2">
          <PanelHeader
            title="Civic trend"
            description={
              period === "all"
                ? "Issues reported and resolved each month across the whole history."
                : `Issues reported and resolved per month within the selected period.`
            }
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <IssueTrendChart data={trend} />
        </Panel>

        <Panel className="flex flex-col gap-3 p-4">
          <PanelHeader
            title="Public money"
            description="Portfolio allocation, split by evidence strength."
            icon={<Coins className="h-3.5 w-3.5" />}
          />
          <SpendSplitChart data={spendSplit} />
          <dl className="space-y-0.5">
            <KeyValue label="Allocated" value={formatBdtCompact(budgets.allocatedBdt)} />
            <KeyValue label="Reported" value={formatBdtCompact(budgets.reportedBdt)} tone="info" />
            <KeyValue label="Verified" value={formatBdtCompact(budgets.verifiedBdt)} tone="ok" />
            <KeyValue label="Unverified" value={formatBdtCompact(budgets.unverifiedBdt)} tone="warn" />
          </dl>
        </Panel>
      </div>

      {/* Category + sector charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="flex flex-col gap-3 p-4">
          <PanelHeader
            title="Infrastructure performance"
            description="Open against resolved reports for each civic category."
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <CategoryPerformanceChart data={categoryRows} />
        </Panel>

        <Panel className="flex flex-col gap-3 p-4">
          <PanelHeader
            title="Neighbourhood comparison"
            description="Unresolved issues and recurring sites per sector."
            icon={<MapIcon className="h-3.5 w-3.5" />}
          />
          <SectorComparisonChart data={sectorRows} />
        </Panel>
      </div>

      {/* Money ledger + evidence coverage */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="flex flex-col gap-3 p-4 xl:col-span-2">
          <PanelHeader
            title="Public money ledger"
            description="Reported spend against the allocation, with the verified share separated."
            icon={<Wallet className="h-3.5 w-3.5" />}
            actions={
              <Link
                href="/money-tracker"
                className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-300 hover:text-cyan-200"
              >
                Full tracker <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />

          <div className="rounded-lg border border-slate-800 bg-[#07101d] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[11px] text-slate-400">
                {formatBdt(budgets.reportedBdt)} reported of {formatBdt(budgets.allocatedBdt)}
              </p>
              <p className="font-mono text-sm font-bold text-cyan-200">
                {formatPercent(budgets.reportedUtilisationPercent)}
              </p>
            </div>
            <div className="mt-1.5">
              <SpendBar
                allocated={budgets.allocatedBdt}
                reported={budgets.reportedBdt}
                verified={budgets.verifiedBdt}
                height="h-3"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="ct-hatch h-2 w-2 rounded-sm" /> Unverified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-700" /> Unspent
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {scopedProjects
              .filter((project) => project.status === "delayed" || project.status === "stalled")
              .slice(0, 3)
              .map((project) => (
                <Link
                  key={project.id}
                  href={`/public-projects/${project.id}`}
                  className="block rounded-lg border border-slate-800 bg-[#08101d] p-2.5 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold text-cyan-300">
                      {project.code}
                    </span>
                    <Badge tone={projectStatusTone(project.status)} dot>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-100">
                    {project.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-400">
                    <span className={TONES.warn.label}>
                      {getProjectOverdueDays(project)} days overdue
                    </span>
                    <span>{project.verifiedProgressPercent}% built</span>
                  </div>
                </Link>
              ))}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3 p-4">
          <PanelHeader
            title="Evidence coverage"
            description="How much of the record is substantiated."
            icon={<FileWarning className="h-3.5 w-3.5" />}
          />

          <div className="rounded-lg border border-slate-800 bg-[#07101d] p-3">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                Verified evidence
              </p>
              <p className="font-mono text-lg font-bold text-emerald-300">
                {formatPercent(evidence.verifiedPercent, 0)}
              </p>
            </div>
            <ProgressBar
              value={evidence.verifiedPercent}
              tone="ok"
              className="mt-2"
              label={`${evidence.evidenceVerified} of ${evidence.evidenceTotal} evidence items verified`}
            />
            <p className="mt-1.5 font-mono text-[10px] text-slate-400">
              {evidence.evidenceVerified} of {evidence.evidenceTotal} archive items verified
            </p>
          </div>

          <dl className="space-y-0.5">
            <KeyValue
              label="Projects with evidence"
              value={`${evidence.projectsWithEvidence} / ${evidence.projectsTotal}`}
              tone={evidence.projectsWithoutEvidence > 0 ? "warn" : "ok"}
            />
            <KeyValue
              label="Issues with evidence"
              value={`${evidence.issuesWithEvidence} / ${evidence.issuesTotal}`}
              tone={evidence.issuesWithoutEvidence > 0 ? "warn" : "ok"}
            />
            <KeyValue label="Records without evidence" value={String(evidence.recordsWithoutEvidence)} tone="warn" />
          </dl>

          <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 p-2.5">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
              <ShieldCheck className="h-3 w-3" /> Missing financial evidence
            </p>
            <ul className="mt-1.5 space-y-1">
              {evidence.projectsMissingVerifiedSpend.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/public-projects/${project.id}`}
                    className="block text-[11px] text-slate-200 hover:text-cyan-200"
                  >
                    <span className="font-mono text-[10px] text-cyan-300">{project.code}</span>{" "}
                    <span className="line-clamp-1">{project.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {/* Sector table */}
      <Panel className="flex flex-col gap-3 p-4">
        <PanelHeader
          title="Sector comparison"
          description="Per-100k rates keep small and large sectors comparable."
          icon={<MapIcon className="h-3.5 w-3.5" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                <th className="py-1.5 pr-3 font-semibold">Sector</th>
                <th className="py-1.5 pr-3 font-semibold">Open issues</th>
                <th className="py-1.5 pr-3 font-semibold">Per 100k</th>
                <th className="py-1.5 pr-3 font-semibold">Recurring</th>
                <th className="py-1.5 pr-3 font-semibold">Projects</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Reported spend</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((row) => (
                <tr key={row.sector.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      href={buildHref({ sector: row.sector.id })}
                      className="group inline-flex items-center gap-2"
                    >
                      <span className="font-mono text-[10px] font-semibold text-cyan-300">
                        {row.sector.code}
                      </span>
                      <span className="text-[11px] text-slate-200 group-hover:text-cyan-200">
                        {row.sector.name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-red-500/80"
                          style={{ width: `${(row.openIssues / maxSectorOpen) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-300">
                        {row.openIssues} / {row.issueCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-slate-300">
                    {row.openIssuesPer100k.toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-slate-300">
                    {row.recurringClusters}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-slate-300">
                    {row.projectCount}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-[10px] text-slate-200">
                    {formatBdtCompact(row.reportedBdt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* AI insights + activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FindingsFeed findings={findings} limit={3} />
          <Link
            href="/ai-investigation"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" /> Open the AI investigation engine
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <Panel className="flex flex-col gap-3 p-4">
          <PanelHeader
            title="Recent civic activity"
            description="Status changes recorded in the selected period."
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          {activity.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/30 px-3 py-6 text-center font-mono text-[10px] text-slate-500">
              No status changes were recorded in this period.
            </p>
          ) : (
            <ol className="relative ml-1 space-y-2.5 border-l border-slate-800 pl-4">
              {activity.map((event) => {
                const tone = issueStatusTone(event.status);
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border border-[#060b14] ${TONES[tone].dot}`}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                      <Link
                        href={`/civic-issues/${event.issueId}`}
                        className="font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        {event.issueCode}
                      </Link>
                      <span className="text-slate-500">{formatDate(event.at)}</span>
                      <Badge tone={tone}>{ISSUE_STATUS_LABELS[event.status]}</Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                      {event.note}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
