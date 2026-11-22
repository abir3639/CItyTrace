import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, FolderKanban, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ProgressBar, SpendBar, StatCard } from "@/components/ui/Data";
import { getSector, PROJECTS, SECTORS } from "@/data";
import type { ProjectStatus } from "@/types/citytrace";
import { PROJECT_STATUS_LABELS } from "@/types/citytrace";
import { getBudgetTotals, getProjectOverdueDays } from "@/lib/stats";
import {
  TONES,
  formatBdtCompact,
  formatDate,
  formatPercent,
  projectStatusTone,
} from "@/utils/formatters";

export const metadata: Metadata = {
  title: "Public Projects · CITYTRACE",
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
  const focus = asString(params.focus);
  const query = asString(params.q);
  const needle = query?.toLowerCase();

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
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Public Projects"
        title="Sanctioned civic works"
        description={`${PROJECTS.length} publicly funded works across six sectors, with the responsible authority, budget position and milestone schedule for each.`}
        actions={
          <Link
            href="/money-tracker"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            Money tracker <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          hint="Sum of every sanctioned ceiling"
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
          hint={`${formatBdtCompact(totals.unverifiedBdt)} has no verification on file`}
          icon={<Building2 className="h-4 w-4" />}
          tone="ok"
        />
      </div>

      <Panel className="flex flex-col gap-3 p-4">
        <PanelHeader
          title="Filter"
          description="By delivery status or sector."
          actions={
            status || sector ? (
              <Link href="/public-projects" className="font-mono text-[10px] text-cyan-300 hover:text-cyan-200">
                Clear
              </Link>
            ) : null
          }
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <form action="/public-projects" method="get" className="flex w-full flex-wrap items-center gap-2">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {sector ? <input type="hidden" name="sector" value={sector} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search projects by name, code, authority or location…"
              aria-label="Search projects"
              className="min-w-[240px] flex-1 rounded-lg border border-slate-800 bg-[#07101d] px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
            >
              Search
            </button>
            {query ? (
              <Link
                href={buildHref({ status: statusParam, sector: sectorParam })}
                className="font-mono text-[10px] text-slate-400 hover:text-cyan-200"
              >
                Clear search
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={buildHref({ sector: sectorParam })}
            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
              !status
                ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
            }`}
          >
            All ({PROJECTS.length})
          </Link>
          {PROJECT_STATUSES.map((value) => {
            const count = PROJECTS.filter((project) => project.status === value).length;
            return (
              <Link
                key={value}
                href={buildHref({ status: value, sector: sectorParam })}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                  status === value
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                {PROJECT_STATUS_LABELS[value]} ({count})
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-slate-700" />
          <Link
            href={buildHref({ status: statusParam })}
            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
              !sector
                ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
            }`}
          >
            All sectors
          </Link>
          {SECTORS.map((item) => (
            <Link
              key={item.id}
              href={buildHref({ status: statusParam, sector: item.id })}
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
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects match these filters"
          description="Every sanctioned work is recorded here; try clearing the status or sector filter."
          action={
            <Link
              href="/public-projects"
              className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              Reset filters
            </Link>
          }
        />
      ) : (
        <Panel className="overflow-hidden p-0">
          <div className="ct-scroll overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0a1421] font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                  <th className="px-3 py-2 font-semibold">Project</th>
                  <th className="px-3 py-2 font-semibold">Sector</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Allocated</th>
                  <th className="px-3 py-2 text-right font-semibold">Reported</th>
                  <th className="px-3 py-2 font-semibold">Spend position</th>
                  <th className="px-3 py-2 font-semibold">Progress</th>
                  <th className="px-3 py-2 font-semibold">Planned finish</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const tone = projectStatusTone(project.status);
                  const projectSector = getSector(project.sectorId);
                  const overdue = getProjectOverdueDays(project);
                  const isFocused = focus === project.id;

                  return (
                    <tr
                      key={project.id}
                      className={`border-b border-slate-800/60 last:border-0 transition-colors ${
                        isFocused ? "bg-cyan-500/10" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="px-3 py-2.5 align-top">
                        <Link
                          href={`/public-projects/${project.id}`}
                          className="font-mono text-[10px] font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          {project.code}
                        </Link>
                        <p className="mt-0.5 max-w-[22rem] text-[11px] font-semibold leading-snug text-slate-100">
                          {project.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-slate-500">
                          <MapPin className="h-2.5 w-2.5" />
                          {project.location}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[10px] text-slate-300">
                        {projectSector?.code ?? project.sectorId}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <Badge tone={tone} dot>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right align-top font-mono text-[10px] text-slate-200">
                        {formatBdtCompact(project.allocatedBudgetBdt)}
                      </td>
                      <td className="px-3 py-2.5 text-right align-top font-mono text-[10px] text-cyan-200">
                        {formatBdtCompact(project.reportedExpenditureBdt)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="w-32">
                          <SpendBar
                            allocated={project.allocatedBudgetBdt}
                            reported={project.reportedExpenditureBdt}
                            verified={project.verifiedExpenditureBdt}
                            height="h-1.5"
                          />
                          <p
                            className={`mt-1 font-mono text-[9px] ${
                              project.verifiedExpenditureBdt === undefined
                                ? TONES.warn.label
                                : TONES.ok.label
                            }`}
                          >
                            {project.verifiedExpenditureBdt === undefined
                              ? "unverified"
                              : `${formatPercent(
                                  (project.verifiedExpenditureBdt / project.allocatedBudgetBdt) * 100,
                                  0
                                )} verified`}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="w-24">
                          <ProgressBar
                            value={project.verifiedProgressPercent}
                            tone={tone}
                            className="h-1.5"
                            label={`${project.verifiedProgressPercent} percent complete`}
                          />
                          <p className="mt-1 font-mono text-[9px] text-slate-400">
                            {project.verifiedProgressPercent}%
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[10px]">
                        <span className="text-slate-300">
                          {formatDate(project.plannedCompletionDate)}
                        </span>
                        {overdue > 0 ? (
                          <p className={`mt-0.5 ${TONES.warn.label}`}>{overdue}d late</p>
                        ) : project.actualCompletionDate ? (
                          <p className={`mt-0.5 ${TONES.ok.label}`}>
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
