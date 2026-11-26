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
import { listAllEvidence, listIssues } from "@/lib/issue-store";
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
  title: "Overview · CityTrace",
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
      className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all active:scale-[0.98] ${
        active
          ? "bg-[#1D1D1F] text-white shadow-sm"
          : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08] hover:text-[#1D1D1F]"
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
  const evidence = getEvidenceCoverage(scopedIssues, listAllEvidence());
  const categories = getCategoryStats(scopedIssues);
  const sectors = getSectorStats(scopedIssues);
  const trend = buildTrend(windowedIssues, periodStart(period));
  const activity = getActivityFeed(windowedIssues).slice(0, 6);
  const findings = findAnomalies(scopedIssues);

  const unspent = Math.max(0, budgets.allocatedBdt - budgets.reportedBdt);
  const spendSplit = [
    { label: "Verified spend", value: budgets.verifiedBdt, fill: "#34C759" },
    { label: "Reported, unverified", value: budgets.unverifiedBdt, fill: "#FF9500" },
    { label: "Unspent", value: unspent, fill: "#007AFF" },
  ];

  const categoryRows = categories.map((row) => ({
    categoryId: row.category,
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
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Transparency Dashboard"
        title="District Civic Health"
        description={`All figures are derived directly from ${allIssues.length} civic issue records and ${PROJECTS.length} public works in the active dataset.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6E6E73] tabular-nums">
              Snapshot · 22 Jul 2025
            </span>
            <Link
              href="/city-explorer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6] active:scale-[0.98]"
            >
              <MapIcon className="h-3.5 w-3.5" />
              Explore 3D City
            </Link>
          </div>
        }
      />

      {/* Flagship Walkthrough */}
      <Panel glow className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#007AFF]" />
            <h2 className="text-[14px] font-semibold text-[#1D1D1F]">
              Featured Case Walkthrough — Begum Rokeya Sarani Link Road
            </h2>
          </div>
          <span className="text-[12px] text-[#6E6E73]">
            Follow one road from 3D map to AI audit
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "01",
              label: "3D Road Corridor",
              sub: "Inspect the spatial pin",
              href: "/city-explorer?feature=issue:ISS-003",
            },
            {
              step: "02",
              label: "3× Issue History",
              sub: "Reopened after 2 repairs",
              href: "/civic-issues/ISS-003",
            },
            {
              step: "03",
              label: "Project & Money Ledger",
              sub: "96.9% spent · 35% built",
              href: "/public-projects/P-R01",
            },
            {
              step: "04",
              label: "AI Investigation",
              sub: "Evidence-cited report",
              href: "/ai-investigation?project=P-R01",
            },
          ].map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-[14px] bg-[#F5F5F7] px-3.5 py-3 transition-all hover:bg-[#EBEEF3] active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#1D1D1F]">
                  <span className="mr-1.5 text-[#007AFF] tabular-nums">{item.step}</span>
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[#6E6E73]">{item.sub}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#86868B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#007AFF]" />
            </Link>
          ))}
        </div>
      </Panel>

      {/* Filters */}
      <Panel className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PanelHeader
            title="Scope"
            description="Narrow metrics by time period, sector, or infrastructure category."
            icon={<Filter className="h-4 w-4" />}
          />
          {hasFilters ? (
            <Link href="/" className="text-[12.5px] font-medium text-[#007AFF] hover:underline">
              Reset filters
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Period</span>
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
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Sector</span>
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
                {item.code} · {item.name}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Category</span>
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
        </div>
      </Panel>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Open civic issues"
          value={String(openIssues)}
          hint={`${scopedIssues.length} records in scope · ${resolvedIssues} resolved on file`}
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/civic-issues"
        />
        <StatCard
          label="Resolved issues"
          value={String(resolvedIssues)}
          hint="Closed reports kept permanently visible"
          tone="ok"
          icon={<ShieldCheck className="h-4 w-4" />}
          href="/civic-issues?status=resolved"
        />
        <StatCard
          label="Recurring problem sites"
          value={String(recurring.length)}
          hint="Physical locations with multiple reports"
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
          hint="Past contracted completion date"
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
        <Panel className="flex flex-col gap-4 p-5 xl:col-span-2">
          <PanelHeader
            title="Civic Trend"
            description={
              period === "all"
                ? "Issues reported and resolved each month across the full timeline."
                : "Issues reported and resolved per month within the selected period."
            }
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <IssueTrendChart data={trend} />
        </Panel>

        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title="Public Money Split"
            description="Portfolio allocation by evidence strength."
            icon={<Coins className="h-4 w-4" />}
          />
          <SpendSplitChart data={spendSplit} />
          <dl>
            <KeyValue label="Allocated" value={formatBdtCompact(budgets.allocatedBdt)} />
            <KeyValue label="Reported" value={formatBdtCompact(budgets.reportedBdt)} tone="info" />
            <KeyValue label="Verified" value={formatBdtCompact(budgets.verifiedBdt)} tone="ok" />
            <KeyValue label="Unverified" value={formatBdtCompact(budgets.unverifiedBdt)} tone="warn" />
          </dl>
        </Panel>
      </div>

      {/* Category + sector charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title="Infrastructure Performance"
            description="Open versus resolved reports for each civic category."
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <CategoryPerformanceChart data={categoryRows} />
        </Panel>

        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title="Neighbourhood Comparison"
            description="Unresolved issues and recurring sites per sector."
            icon={<MapIcon className="h-4 w-4" />}
          />
          <SectorComparisonChart data={sectorRows} />
        </Panel>
      </div>

      {/* Money ledger + evidence coverage */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="flex flex-col gap-4 p-5 xl:col-span-2">
          <PanelHeader
            title="Public Money Ledger"
            description="Reported expenditure against allocation, with verified spend separated."
            icon={<Wallet className="h-4 w-4" />}
            actions={
              <Link
                href="/money-tracker"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#007AFF] hover:underline"
              >
                Full tracker <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          <div className="ct-surface-inset rounded-[16px] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-[#48484A] tabular-nums">
                {formatBdt(budgets.reportedBdt)} reported of {formatBdt(budgets.allocatedBdt)}
              </p>
              <p className="text-[15px] font-semibold text-[#0055CC] tabular-nums">
                {formatPercent(budgets.reportedUtilisationPercent)}
              </p>
            </div>
            <div className="mt-2">
              <SpendBar
                allocated={budgets.allocatedBdt}
                reported={budgets.reportedBdt}
                verified={budgets.verifiedBdt}
                height="h-3"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[#6E6E73]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#34C759]" /> Verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="ct-hatch h-2.5 w-2.5 rounded-sm" /> Unverified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" /> Unspent
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
                  className="block rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3.5 transition-colors hover:bg-[#F0F2F5]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                      {project.code}
                    </span>
                    <Badge tone={projectStatusTone(project.status)} dot>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[13.5px] font-semibold text-[#1D1D1F]">
                    {project.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6E6E73] tabular-nums">
                    <span className={TONES.warn.label}>
                      {getProjectOverdueDays(project)} days overdue
                    </span>
                    <span>{project.verifiedProgressPercent}% built</span>
                  </div>
                </Link>
              ))}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title="Evidence Coverage"
            description="Proportion of records backed by archive items."
            icon={<FileWarning className="h-4 w-4" />}
          />

          <div className="ct-surface-inset rounded-[16px] p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[12.5px] font-medium text-[#6E6E73]">Verified evidence</p>
              <p className="text-[20px] font-semibold text-[#1A7F37] tabular-nums">
                {formatPercent(evidence.verifiedPercent, 0)}
              </p>
            </div>
            <ProgressBar
              value={evidence.verifiedPercent}
              tone="ok"
              className="mt-2.5"
              label={`${evidence.evidenceVerified} of ${evidence.evidenceTotal} evidence items verified`}
            />
            <p className="mt-2 text-[12px] text-[#6E6E73] tabular-nums">
              {evidence.evidenceVerified} of {evidence.evidenceTotal} archive items verified
            </p>
          </div>

          <dl>
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
            <KeyValue
              label="Records without evidence"
              value={String(evidence.recordsWithoutEvidence)}
              tone="warn"
            />
          </dl>

          <div className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.07] p-3.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#B25000]">
              <ShieldCheck className="h-3.5 w-3.5" /> Missing financial evidence
            </p>
            <ul className="mt-2 space-y-1.5">
              {evidence.projectsMissingVerifiedSpend.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/public-projects/${project.id}`}
                    className="block text-[12.5px] text-[#1D1D1F] hover:text-[#007AFF]"
                  >
                    <span className="font-semibold text-[#0055CC] tabular-nums">
                      {project.code}
                    </span>{" "}
                    <span className="line-clamp-1">{project.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      {/* Sector table */}
      <Panel className="flex flex-col gap-4 p-5">
        <PanelHeader
          title="Sector Comparison"
          description="Per-100k rates normalize comparisons across sectors of different sizes."
          icon={<MapIcon className="h-4 w-4" />}
        />
        <div
          tabIndex={0}
          role="region"
          aria-label="Sector comparison table"
          className="ct-scroll overflow-x-auto rounded-[14px] border border-black/[0.06]"
        >
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">
              Sector comparison of open issues, per-100k rates, recurring sites, projects, and reported spend
            </caption>
            <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
              <tr className="border-b border-black/[0.06] text-[12px] font-medium text-[#6E6E73]">
                <th scope="col" className="px-4 py-2.5">Sector</th>
                <th scope="col" className="px-4 py-2.5">Open issues</th>
                <th scope="col" className="px-4 py-2.5">Per 100k</th>
                <th scope="col" className="px-4 py-2.5">Recurring</th>
                <th scope="col" className="px-4 py-2.5">Projects</th>
                <th scope="col" className="px-4 py-2.5 text-right">Reported spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] bg-white">
              {sectors.map((row) => (
                <tr key={row.sector.id} className="transition-colors hover:bg-[#F9FAFB]">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link
                      href={buildHref({ sector: row.sector.id })}
                      className="group inline-flex items-center gap-2"
                    >
                      <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                        {row.sector.code}
                      </span>
                      <span className="text-[13px] font-medium text-[#1D1D1F] group-hover:text-[#007AFF]">
                        {row.sector.name}
                      </span>
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#FF3B30]"
                          style={{ width: `${(row.openIssues / maxSectorOpen) * 100}%` }}
                        />
                      </div>
                      <span className="text-[12.5px] text-[#1D1D1F] tabular-nums">
                        {row.openIssues} / {row.issueCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#48484A] tabular-nums">
                    {row.openIssuesPer100k.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#48484A] tabular-nums">
                    {row.recurringClusters}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-[#48484A] tabular-nums">
                    {row.projectCount}
                  </td>
                  <td className="px-4 py-3 text-right text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
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
        <div className="flex flex-col gap-3">
          <FindingsFeed findings={findings} limit={3} />
          <Link
            href="/ai-investigation"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#007AFF] shadow-sm transition-all hover:bg-[#F9FAFB]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Open AI Investigation Engine
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title="Recent Civic Activity"
            description="Status updates recorded in the selected period."
            icon={<TrendingUp className="h-4 w-4" />}
          />
          {activity.length === 0 ? (
            <p className="rounded-[14px] bg-[#F5F5F7] px-4 py-8 text-center text-[13px] text-[#6E6E73]">
              No status changes were recorded in this period.
            </p>
          ) : (
            <ol className="relative ml-2 space-y-3.5 border-l border-black/[0.08] pl-4">
              {activity.map((event) => {
                const tone = issueStatusTone(event.status);
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${TONES[tone].dot}`}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <Link
                        href={`/civic-issues/${event.issueId}`}
                        className="font-semibold text-[#0055CC] hover:underline tabular-nums"
                      >
                        {event.issueCode}
                      </Link>
                      <span className="text-[#6E6E73] tabular-nums">{formatDate(event.at)}</span>
                      <Badge tone={tone}>{ISSUE_STATUS_LABELS[event.status]}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#48484A]">
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
