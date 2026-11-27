import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Filter, MapPin, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Data";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { SECTORS, getProject, getSector } from "@/data";
import { getCurrentUser } from "@/lib/auth-store";
import { DEPARTMENTS, getDepartment, getDepartmentForIssue } from "@/lib/departments";
import { getUserWatchlist } from "@/lib/governance-store";
import { listIssues } from "@/lib/issue-store";
import { normalizeIssueStatus } from "@/lib/permissions";
import { deriveIssueSla } from "@/lib/sla";
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
  title: "Civic Issues · CityTrace",
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
  const currentUser = await getCurrentUser();
  const watchlist = currentUser
    ? await getUserWatchlist(currentUser.id)
    : { issues: [], sectors: [], projects: [] };

  const statusParam = asString(params.status);
  const categoryParam = asString(params.category);
  const sectorParam = asString(params.sector);
  const deptParam = asString(params.dept);
  const slaParam = asString(params.sla);
  const followedParam = asString(params.followed);
  const focus = asString(params.focus);

  const normalizedStatus = normalizeIssueStatus(statusParam);
  const status =
    normalizedStatus && ISSUE_STATUS_ORDER.includes(normalizedStatus)
      ? normalizedStatus
      : undefined;
  const category = ISSUE_CATEGORIES.includes(categoryParam as IssueCategory)
    ? (categoryParam as IssueCategory)
    : undefined;
  const sector = SECTORS.some((item) => item.id === sectorParam) ? sectorParam : undefined;
  const dept = getDepartment(deptParam)?.id;
  const slaFilter =
    slaParam === "overdue" || slaParam === "due_soon" || slaParam === "verification_pending"
      ? slaParam
      : undefined;
  const followedOnly = followedParam === "1" && Boolean(currentUser);

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
      if (dept && getDepartmentForIssue(issue).id !== dept) return false;
      if (slaFilter && deriveIssueSla(issue).state !== slaFilter) return false;
      if (
        followedOnly &&
        !watchlist.issues.includes(issue.id) &&
        !watchlist.sectors.includes(issue.sectorId)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const openCount = allIssues.filter((issue) => issue.status !== "resolved").length;

  const statusCounts = (value: IssueStatus) =>
    allIssues.filter((issue) => issue.status === value).length;
  const categoryCounts = (value: IssueCategory) =>
    allIssues.filter((issue) => issue.category === value).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Civic Intelligence"
        title="Permanent Civic Issue Register"
        description={`${allIssues.length} issue records (${openCount} open). Resolved issues remain permanently visible so citizens can track whether problems return.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6E6E73] tabular-nums">
              {filtered.length} shown
            </span>
            <Link
              href="/civic-issues/report"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Report an issue
            </Link>
          </div>
        }
      />

      <Panel className="flex flex-col gap-3.5 p-5">
        <PanelHeader
          title="Filters"
          description="Narrow the register by workflow state, category, or sector."
          icon={<Filter className="h-4 w-4" />}
          actions={
            status || category || sector || dept || slaFilter || followedOnly ? (
              <Link href="/civic-issues" className="text-[12.5px] font-medium text-[#007AFF] hover:underline">
                Clear all
              </Link>
            ) : null
          }
        />

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Status</span>
            <Link
              href={buildHref({
                category: categoryParam,
                sector: sectorParam,
                dept,
                sla: slaFilter,
              })}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                !status
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
              }`}
            >
              All ({allIssues.length})
            </Link>
            {ISSUE_STATUS_ORDER.map((value) => (
              <Link
                key={value}
                href={buildHref({
                  status: value,
                  category: categoryParam,
                  sector: sectorParam,
                  dept,
                  sla: slaFilter,
                })}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors tabular-nums ${
                  status === value
                    ? "bg-[#1D1D1F] text-white"
                    : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
                }`}
              >
                {ISSUE_STATUS_LABELS[value]} ({statusCounts(value)})
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Dept / SLA</span>
            <Link
              href={buildHref({
                status: statusParam,
                category: categoryParam,
                sector: sectorParam,
              })}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                !dept && !slaFilter
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
              }`}
            >
              All depts
            </Link>
            {DEPARTMENTS.map((d) => (
              <Link
                key={d.id}
                href={buildHref({
                  status: statusParam,
                  category: categoryParam,
                  sector: sectorParam,
                  dept: d.id,
                  sla: slaFilter,
                })}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  dept === d.id
                    ? "bg-[#1D1D1F] text-white"
                    : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
                }`}
              >
                {d.shortName}
              </Link>
            ))}
            <Link
              href={buildHref({
                status: statusParam,
                category: categoryParam,
                sector: sectorParam,
                dept,
                sla: slaFilter === "overdue" ? undefined : "overdue",
              })}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                slaFilter === "overdue"
                  ? "bg-[#FF3B30] text-white"
                  : "bg-[#FF3B30]/[0.09] text-[#C9241B] hover:bg-[#FF3B30]/[0.15]"
              }`}
            >
              Overdue SLA
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Category</span>
            <Link
              href={buildHref({ status: statusParam, sector: sectorParam })}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                !category
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
              }`}
            >
              All
            </Link>
            {ISSUE_CATEGORIES.map((value) => (
              <Link
                key={value}
                href={buildHref({ status: statusParam, category: value, sector: sectorParam })}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors tabular-nums ${
                  category === value
                    ? "bg-[#1D1D1F] text-white"
                    : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
                }`}
              >
                {CATEGORY_LABELS[value]} ({categoryCounts(value)})
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-[12px] font-medium text-[#6E6E73]">Sector</span>
            <Link
              href={buildHref({ status: statusParam, category: categoryParam })}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                !sector
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
              }`}
            >
              All
            </Link>
            {SECTORS.map((item) => (
              <Link
                key={item.id}
                href={buildHref({ status: statusParam, category: categoryParam, sector: item.id })}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  sector === item.id
                    ? "bg-[#1D1D1F] text-white"
                    : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
                }`}
              >
                {item.code} · {item.name}
              </Link>
            ))}
          </div>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No issues match these filters"
          description="Try clearing a filter — every issue stays in the register permanently, including resolved records."
          action={
            <Link
              href="/civic-issues"
              className="rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0066D6]"
            >
              Reset filters
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((issue) => {
            const tone = issueStatusTone(issue.status);
            const issueSector = getSector(issue.sectorId);
            const issueDept = getDepartmentForIssue(issue);
            const sla = deriveIssueSla(issue);
            const project = issue.projectId ? getProject(issue.projectId) : undefined;
            const isRecurring = recurringKeys.has(issue.locationKey);
            const isFocused = focus === issue.id;

            return (
              <Panel
                key={issue.id}
                glow={isFocused}
                className={`flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isFocused ? "ring-2 ring-[#007AFF]" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
                      {issue.code}
                    </span>
                    <Badge tone={tone} dot>
                      {ISSUE_STATUS_LABELS[issue.status]}
                    </Badge>
                    <Badge tone={severityTone(issue.severity)}>
                      {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                    </Badge>
                    {sla.state === "overdue" ? (
                      <Badge tone="danger">{sla.label}</Badge>
                    ) : sla.state === "due_soon" || sla.state === "verification_pending" ? (
                      <Badge tone="warn">{sla.label}</Badge>
                    ) : null}
                    {isRecurring ? (
                      <Badge tone="warn" title="Multiple reports at this physical location">
                        Recurring
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-[12px] text-[#6E6E73] tabular-nums">
                    {issueDept.code} · {formatDate(issue.updatedAt)}
                  </span>
                </div>

                <Link href={`/civic-issues/${issue.id}`} className="group block">
                  <h2 className="text-[15px] font-semibold leading-snug text-[#1D1D1F] group-hover:text-[#007AFF]">
                    {issue.title}
                  </h2>
                  <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#6E6E73]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
                    <span className="min-w-0">
                      {issue.location}
                      {issueSector ? ` · ${issueSector.name} (${issueSector.code})` : ""}
                    </span>
                  </p>
                </Link>

                <p className="line-clamp-2 text-[13px] leading-relaxed text-[#48484A]">
                  {issue.description}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-3 text-[12px] text-[#6E6E73] tabular-nums">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {issue.reportedBy ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#1D1D1F]">
                        <UserAvatar
                          initials={issue.reportedBy.initials}
                          color={issue.reportedBy.avatarColor}
                          size="xs"
                        />
                        {issue.reportedBy.name}
                      </span>
                    ) : null}
                    <span>· {CATEGORY_LABELS[issue.category]}</span>
                    <span>
                      · {issue.reportCount}{" "}
                      {issue.reportCount === 1 ? "confirmation" : "confirmations"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {project ? (
                      <Link
                        href={`/public-projects/${project.id}`}
                        className="inline-flex items-center gap-1 font-medium text-[#1D1D1F] hover:text-[#007AFF]"
                      >
                        <Wrench className="h-3 w-3 text-[#6E6E73]" /> {project.code}
                      </Link>
                    ) : null}
                    <Link
                      href={`/civic-issues/${issue.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#007AFF] hover:underline"
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
