import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  FolderKanban,
  LayoutGrid,
  MapPin,
  Search,
  Sparkles,
  Table2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ProgressBar, SpendBar, StatCard } from "@/components/ui/Data";
import { getSector, PROJECTS, SECTORS } from "@/data";
import type { ProjectStatus } from "@/types/citytrace";
import { CATEGORY_LABELS, PROJECT_STATUS_LABELS } from "@/types/citytrace";
import { getBudgetTotals, getMilestoneTotals, getProjectOverdueDays } from "@/lib/stats";
import {
  TONES,
  formatBdtCompact,
  formatDate,
  formatPercent,
  projectStatusTone,
  severityTone,
} from "@/utils/formatters";

export const metadata: Metadata = {
  title: "Public Projects · CityTrace",
};

const PROJECT_STATUSES: ProjectStatus[] = [
  "planned",
  "active",
  "delayed",
  "completed",
  "stalled",
];

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
  return query ? `/public-projects?${query}` : "/public-projects";
}

export default async function PublicProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const statusParam = asString(params.status);
  const sectorParam = asString(params.sector);
  const viewParam = asString(params.view);
  const focus = asString(params.focus);
  const query = asString(params.q);
  const needle = query?.toLowerCase();

  const view: "cards" | "table" = viewParam === "table" ? "table" : "cards";
  const viewValue = view === "table" ? "table" : undefined;

  const status = PROJECT_STATUSES.includes(statusParam as ProjectStatus)
    ? (statusParam as ProjectStatus)
    : undefined;
  const sector = SECTORS.some((item) => item.id === sectorParam) ? sectorParam : undefined;

  const filtered = PROJECTS.filter((project) => {
    if (status && project.status !== status) return false;
    if (sector && project.sectorId !== sector) return false;
    if (needle) {
      const haystack =
        `${project.code} ${project.name} ${project.location} ${project.authority}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const totals = getBudgetTotals(PROJECTS);
  const completed = PROJECTS.filter((project) => project.status === "completed").length;
  const delayed = PROJECTS.filter(
    (project) => project.status === "delayed" || project.status === "stalled"
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Public Projects"
        title="Sanctioned Civic Works"
        description={`${PROJECTS.length} publicly funded works across six sectors, tracking responsible authorities, budgets, and delivery milestones.`}
        actions={
          <Link
            href="/money-tracker"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-semibold text-[#007AFF] shadow-sm hover:bg-[#F9FAFB]"
          >
            Money tracker <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sanctioned projects"
          value={String(PROJECTS.length)}
          hint={`${completed} completed · ${delayed} delayed or stalled`}
          icon={<FolderKanban className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label="Total allocation"
          value={formatBdtCompact(totals.allocatedBdt)}
          hint="Combined sanctioned ceiling"
          icon={<Building2 className="h-4 w-4" />}
          tone="neutral"
        />
        <StatCard
          label="Reported expenditure"
          value={formatBdtCompact(totals.reportedBdt)}
          hint={`${formatPercent(totals.reportedUtilisationPercent)} of allocation`}
          icon={<CalendarClock className="h-4 w-4" />}
          tone="warn"
        />
        <StatCard
          label="Verified expenditure"
          value={formatBdtCompact(totals.verifiedBdt)}
          hint={`${formatBdtCompact(totals.unverifiedBdt)} unverified`}
          icon={<Building2 className="h-4 w-4" />}
          tone="ok"
        />
      </div>

      <Panel className="flex flex-col gap-4 p-5">
        <PanelHeader
          title="Filter & Search"
          description="Narrow works by status, sector, or keyword."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="ct-segmented">
                <Link
                  href={buildHref({
                    status: statusParam,
                    sector: sectorParam,
                    q: query,
                  })}
                  aria-current={view === "cards" ? "page" : undefined}
                  className="ct-segmented-item inline-flex items-center gap-1.5"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </Link>
                <Link
                  href={buildHref({
                    status: statusParam,
                    sector: sectorParam,
                    q: query,
                    view: "table",
                  })}
                  aria-current={view === "table" ? "page" : undefined}
                  className="ct-segmented-item inline-flex items-center gap-1.5"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Table
                </Link>
              </div>
              {status || sector || query ? (
                <Link
                  href={buildHref({ view: viewValue })}
                  className="text-[12.5px] font-medium text-[#007AFF] hover:underline"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          }
        />

        <form action="/public-projects" method="get" className="flex w-full flex-wrap items-center gap-2.5">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {sector ? <input type="hidden" name="sector" value={sector} /> : null}
          {view === "table" ? <input type="hidden" name="view" value="table" /> : null}
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-black/[0.08] bg-[#F5F5F7] px-4 py-2 focus-within:border-[#007AFF] focus-within:bg-white">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#86868B]" />
            <input
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search projects by name, code, authority, or location…"
              aria-label="Search projects"
              className="w-full bg-transparent text-[13.5px] text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0066D6] cursor-pointer"
          >
            Search
          </button>
          {query ? (
            <Link
              href={buildHref({ status: statusParam, sector: sectorParam, view: viewValue })}
              className="text-[12.5px] text-[#6E6E73] hover:text-[#007AFF]"
            >
              Clear search
            </Link>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={buildHref({ sector: sectorParam, q: query, view: viewValue })}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              !status
                ? "bg-[#1D1D1F] text-white"
                : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
            }`}
          >
            All ({PROJECTS.length})
          </Link>
          {PROJECT_STATUSES.map((value) => {
            const count = PROJECTS.filter((project) => project.status === value).length;
            return (
              <Link
                key={value}
                href={buildHref({ status: value, sector: sectorParam, q: query, view: viewValue })}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors tabular-nums ${
                  status === value
                    ? "bg-[#1D1D1F] text-white"
                    : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
                }`}
              >
                {PROJECT_STATUS_LABELS[value]} ({count})
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-black/[0.1]" />
          <Link
            href={buildHref({ status: statusParam, q: query, view: viewValue })}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              !sector
                ? "bg-[#1D1D1F] text-white"
                : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
            }`}
          >
            All sectors
          </Link>
          {SECTORS.map((item) => (
            <Link
              key={item.id}
              href={buildHref({ status: statusParam, sector: item.id, q: query, view: viewValue })}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                sector === item.id
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
              }`}
            >
              {item.code}
            </Link>
          ))}
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects match these filters"
          description="Try clearing the status, sector, or search filter."
          action={
            <Link
              href={buildHref({ view: viewValue })}
              className="rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0066D6]"
            >
              Reset filters
            </Link>
          }
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((project) => {
            const tone = projectStatusTone(project.status);
            const projectSector = getSector(project.sectorId);
            const overdue = getProjectOverdueDays(project);
            const milestones = getMilestoneTotals(project);
            const isFocused = focus === project.id;
            const reportedPct =
              project.allocatedBudgetBdt > 0
                ? (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100
                : 0;

            return (
              <Panel
                key={project.id}
                glow={isFocused}
                className={`flex flex-col gap-3.5 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isFocused ? "ring-2 ring-[#007AFF]" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
                      {project.code}
                    </span>
                    <Badge tone={severityTone(project.severity)}>
                      {project.severity.charAt(0).toUpperCase() + project.severity.slice(1)}
                    </Badge>
                    <Badge tone={tone} dot>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                    {overdue > 0 ? <Badge tone="warn">{overdue}d late</Badge> : null}
                  </div>
                  <span className="text-[12px] text-[#6E6E73]">
                    {projectSector?.code ?? project.sectorId} · {CATEGORY_LABELS[project.category]}
                  </span>
                </div>

                <div>
                  <Link href={`/public-projects/${project.id}`} className="group block">
                    <h2 className="text-[16px] font-semibold leading-snug text-[#1D1D1F] group-hover:text-[#007AFF]">
                      {project.name}
                    </h2>
                  </Link>
                  <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#6E6E73]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
                    <span>{project.location}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#86868B]">{project.authority}</p>
                </div>

                <div className="ct-surface-inset rounded-[14px] p-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px] tabular-nums">
                    <span className="text-[#48484A]">
                      {formatBdtCompact(project.reportedExpenditureBdt)} reported of{" "}
                      {formatBdtCompact(project.allocatedBudgetBdt)}
                    </span>
                    <span className="font-semibold text-[#0055CC]">
                      {formatPercent(reportedPct, 0)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <SpendBar
                      allocated={project.allocatedBudgetBdt}
                      reported={project.reportedExpenditureBdt}
                      verified={project.verifiedExpenditureBdt}
                      height="h-2"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] tabular-nums">
                    <span
                      className={
                        project.verifiedExpenditureBdt === undefined
                          ? TONES.warn.label
                          : TONES.ok.label
                      }
                    >
                      {project.verifiedExpenditureBdt === undefined
                        ? "Missing verified spend"
                        : `${formatBdtCompact(project.verifiedExpenditureBdt)} verified`}
                    </span>
                    <span className="text-[#6E6E73]">
                      Planned {formatDate(project.plannedCompletionDate)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[12px] text-[#6E6E73] tabular-nums">
                    <span>
                      Physical progress · {milestones.met}/{milestones.total} milestones met
                      {milestones.missed > 0 ? ` · ${milestones.missed} missed` : ""}
                    </span>
                    <span className="font-semibold text-[#1D1D1F]">
                      {project.verifiedProgressPercent}%
                    </span>
                  </div>
                  <ProgressBar
                    value={project.verifiedProgressPercent}
                    tone={tone}
                    className="mt-1.5 h-1.5"
                    label={`${project.verifiedProgressPercent} percent complete`}
                  />
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-3 text-[12.5px]">
                  <div className="flex items-center gap-3.5">
                    <Link
                      href={`/city-explorer?feature=project:${project.id}`}
                      className="inline-flex items-center gap-1 font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#007AFF]" /> Locate on 3D map
                    </Link>
                    <Link
                      href={`/ai-investigation?project=${project.id}`}
                      className="inline-flex items-center gap-1 font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" /> Investigate
                    </Link>
                  </div>
                  <Link
                    href={`/public-projects/${project.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#007AFF] hover:underline"
                  >
                    Project ledger <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel className="overflow-hidden p-0">
          <div
            tabIndex={0}
            role="region"
            aria-label="Sanctioned public projects table"
            className="ct-scroll overflow-x-auto"
          >
            <table className="w-full min-w-[980px] border-collapse text-left">
              <caption className="sr-only">
                Sanctioned public works showing sector, status, allocated budget, reported spend, spend position, progress, and planned finish date
              </caption>
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-black/[0.06] text-[12px] font-medium text-[#6E6E73]">
                  <th scope="col" className="px-4 py-3">Project</th>
                  <th scope="col" className="px-3 py-3">Sector</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3 text-right">Allocated</th>
                  <th scope="col" className="px-3 py-3 text-right">Reported</th>
                  <th scope="col" className="px-3 py-3">Spend position</th>
                  <th scope="col" className="px-3 py-3">Progress</th>
                  <th scope="col" className="px-4 py-3">Planned finish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] bg-white">
                {filtered.map((project) => {
                  const tone = projectStatusTone(project.status);
                  const projectSector = getSector(project.sectorId);
                  const overdue = getProjectOverdueDays(project);
                  const isFocused = focus === project.id;

                  return (
                    <tr
                      key={project.id}
                      className={`transition-colors ${
                        isFocused ? "bg-[#007AFF]/[0.06]" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <th scope="row" className="px-4 py-3.5 align-top font-normal">
                        <Link
                          href={`/public-projects/${project.id}`}
                          className="text-[12px] font-semibold text-[#0055CC] hover:underline tabular-nums"
                        >
                          {project.code}
                        </Link>
                        <p className="mt-0.5 max-w-[22rem] text-[13px] font-semibold leading-snug text-[#1D1D1F]">
                          {project.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#6E6E73]">
                          <MapPin className="h-3 w-3" />
                          {project.location}
                        </p>
                      </th>
                      <td className="px-3 py-3.5 align-top text-[12.5px] text-[#48484A]">
                        {projectSector?.code ?? project.sectorId}
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <Badge tone={tone} dot>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-right align-top text-[12.5px] text-[#1D1D1F] tabular-nums">
                        {formatBdtCompact(project.allocatedBudgetBdt)}
                      </td>
                      <td className="px-3 py-3.5 text-right align-top text-[12.5px] font-medium text-[#0055CC] tabular-nums">
                        {formatBdtCompact(project.reportedExpenditureBdt)}
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="w-32">
                          <SpendBar
                            allocated={project.allocatedBudgetBdt}
                            reported={project.reportedExpenditureBdt}
                            verified={project.verifiedExpenditureBdt}
                            height="h-1.5"
                          />
                          <p
                            className={`mt-1 text-[11px] tabular-nums ${
                              project.verifiedExpenditureBdt === undefined
                                ? TONES.warn.label
                                : TONES.ok.label
                            }`}
                          >
                            {project.verifiedExpenditureBdt === undefined
                              ? "Unverified"
                              : `${formatPercent(
                                  (project.verifiedExpenditureBdt / project.allocatedBudgetBdt) * 100,
                                  0
                                )} verified`}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="w-24">
                          <ProgressBar
                            value={project.verifiedProgressPercent}
                            tone={tone}
                            className="h-1.5"
                            label={`${project.verifiedProgressPercent} percent complete`}
                          />
                          <p className="mt-1 text-[11px] text-[#6E6E73] tabular-nums">
                            {project.verifiedProgressPercent}%
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-[12.5px] tabular-nums">
                        <span className="text-[#1D1D1F]">
                          {formatDate(project.plannedCompletionDate)}
                        </span>
                        {overdue > 0 ? (
                          <p className={`mt-0.5 text-[11.5px] ${TONES.warn.label}`}>{overdue}d late</p>
                        ) : project.actualCompletionDate ? (
                          <p className={`mt-0.5 text-[11.5px] ${TONES.ok.label}`}>
                            {formatDate(project.actualCompletionDate)}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
