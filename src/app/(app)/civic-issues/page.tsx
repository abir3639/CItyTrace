import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Filter, MapPin, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Data";
import { SECTORS, getProject, getSector } from "@/data";
import { listIssues } from "@/lib/issue-store";
import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  type IssueCategory,
  type IssueStatus,
} from "@/types/citytrace";
import {
  formatDate,
  issueStatusTone,
  severityTone,
} from "@/utils/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Civic Issues · CITYTRACE",
};

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
  return query ? `/civic-issues?${query}` : "/civic-issues";
}

export default async function CivicIssuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const allIssues = listIssues();

  const statusParam = asString(params.status);
  const categoryParam = asString(params.category);
  const sectorParam = asString(params.sector);
  const focus = asString(params.focus);

  const status = ISSUE_STATUS_ORDER.includes(statusParam as IssueStatus)
    ? (statusParam as IssueStatus)
    : undefined;
  const category = ISSUE_CATEGORIES.includes(categoryParam as IssueCategory)
    ? (categoryParam as IssueCategory)
    : undefined;
  const sector = SECTORS.some((item) => item.id === sectorParam) ? sectorParam : undefined;

  // Recurrence is computed from the live list, so citizen reports participate.
  const locationCounts = new Map<string, number>();
  for (const issue of allIssues) {
    locationCounts.set(issue.locationKey, (locationCounts.get(issue.locationKey) ?? 0) + 1);
  }
  const recurringKeys = new Set(
    [...locationCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
  );

  const filtered = allIssues
    .filter((issue) => {
      if (status && issue.status !== status) return false;
      if (category && issue.category !== category) return false;
      if (sector && issue.sectorId !== sector) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const openCount = allIssues.filter((issue) => issue.status !== "resolved").length;

  const statusCounts = (value: IssueStatus) =>
    allIssues.filter((issue) => issue.status === value).length;
  const categoryCounts = (value: IssueCategory) =>
    allIssues.filter((issue) => issue.category === value).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Civic Intelligence"
        title="Permanent civic issue register"
        description={`${allIssues.length} issue records, ${openCount} still open. Resolved issues are never deleted — they stay on record so citizens can see whether the same problem returned.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 font-mono text-[10px] text-slate-300">
              {filtered.length} shown
            </span>
            <Link
              href="/civic-issues/report"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/60 bg-gradient-to-r from-cyan-500 to-sky-500 px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-950 uppercase shadow-[0_0_20px_-6px_rgba(34,211,238,0.7)] hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> Report an issue
            </Link>
          </div>
        }
      />

      <Panel className="flex flex-col gap-3 p-4">
        <PanelHeader
          title="Filters"
          description="Narrow the register by workflow state, category or sector."
          icon={<Filter className="h-3.5 w-3.5" />}
          actions={
            status || category || sector ? (
              <Link href="/civic-issues" className="font-mono text-[10px] text-cyan-300 hover:text-cyan-200">
                Clear all
              </Link>
            ) : null
          }
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-16 shrink-0 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
              Status
            </span>
            <Link
              href={buildHref({ category: categoryParam, sector: sectorParam })}
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                !status
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                  : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              All ({allIssues.length})
            </Link>
            {ISSUE_STATUS_ORDER.map((value) => (
              <Link
                key={value}
                href={buildHref({ status: value, category: categoryParam, sector: sectorParam })}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                  status === value
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                {ISSUE_STATUS_LABELS[value]} ({statusCounts(value)})
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-16 shrink-0 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
              Category
            </span>
            <Link
              href={buildHref({ status: statusParam, sector: sectorParam })}
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                !category
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                  : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              All
            </Link>
            {ISSUE_CATEGORIES.map((value) => (
              <Link
                key={value}
                href={buildHref({ status: statusParam, category: value, sector: sectorParam })}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                  category === value
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                {CATEGORY_LABELS[value]} ({categoryCounts(value)})
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-16 shrink-0 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
              Sector
            </span>
            <Link
              href={buildHref({ status: statusParam, category: categoryParam })}
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                !sector
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                  : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              All
            </Link>
            {SECTORS.map((item) => (
              <Link
                key={item.id}
                href={buildHref({ status: statusParam, category: categoryParam, sector: item.id })}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                  sector === item.id
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                {item.code}
              </Link>
            ))}
          </div>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No issues match these filters"
          description="Try clearing a filter — every issue stays in the register permanently, so a resolved record is still searchable."
          action={
            <Link
              href="/civic-issues"
              className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              Reset filters
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((issue) => {
            const tone = issueStatusTone(issue.status);
            const issueSector = getSector(issue.sectorId);
            const project = issue.projectId ? getProject(issue.projectId) : undefined;
            const isRecurring = recurringKeys.has(issue.locationKey);
            const isFocused = focus === issue.id;

            return (
              <Panel
                key={issue.id}
                glow={isFocused}
                className={`flex flex-col gap-2 p-3.5 transition-colors hover:border-cyan-500/40 ${
                  isFocused ? "ring-1 ring-cyan-400/50" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                      {issue.code}
                    </span>
                    <Badge tone={tone} dot>
                      {ISSUE_STATUS_LABELS[issue.status]}
                    </Badge>
                    <Badge tone={severityTone(issue.severity)}>
                      {issue.severity.toUpperCase()}
                    </Badge>
                    {isRecurring ? (
                      <Badge tone="warn" title="More than one report at this physical location">
                        RECURRING
                      </Badge>
                    ) : null}
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    {formatDate(issue.updatedAt)}
                  </span>
                </div>

                <Link href={`/civic-issues/${issue.id}`} className="group block">
                  <h3 className="text-[13px] font-semibold leading-snug text-slate-50 group-hover:text-cyan-200">
                    {issue.title}
                  </h3>
                  <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" />
                    <span className="min-w-0">
                      {issue.location}
                      {issueSector ? ` · ${issueSector.name} (${issueSector.code})` : ""}
                    </span>
                  </p>
                </Link>

                <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                  {issue.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 font-mono text-[10px] text-slate-400">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{CATEGORY_LABELS[issue.category]}</span>
                    <span>{issue.reportCount} citizen reports</span>
                    <span>{issue.history.length} status events</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {project ? (
                      <Link
                        href={`/public-projects/${project.id}`}
                        className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                      >
                        <Wrench className="h-3 w-3" /> {project.code}
                      </Link>
                    ) : null}
                    <Link
                      href={`/civic-issues/${issue.id}`}
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                    >
                      Open file <ArrowRight className="h-3 w-3" />
                    </Link>
                  </span>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
