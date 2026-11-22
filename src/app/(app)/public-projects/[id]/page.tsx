import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { KeyValue, ProgressBar, SpendBar } from "@/components/ui/Data";
import { EvidenceGallery } from "@/components/evidence/EvidenceTile";
import { ProjectSpendChart } from "@/components/money/MoneyCharts";
import { getEvidence, getSector, projectsById } from "@/data";
import { listIssues } from "@/lib/issue-store";
import { getBudgetFor, getMilestoneTotals, getProjectOverdueDays } from "@/lib/stats";
import { PROJECT_STATUS_LABELS } from "@/types/citytrace";
import {
  TONES,
  daysBetween,
  formatBdt,
  formatBdtCompact,
  formatDate,
  formatPercent,
  issueStatusTone,
  projectStatusTone,
  severityTone,
} from "@/utils/formatters";
import { ISSUE_STATUS_LABELS } from "@/types/citytrace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = projectsById.get(id);
  return {
    title: project
      ? `${project.code} · Public Projects · CITYTRACE`
      : "Project not found · CITYTRACE",
  };
}

const MILESTONE_TONE = {
  met: "ok",
  missed: "danger",
  "in-progress": "info",
  pending: "neutral",
} as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = projectsById.get(id);
  if (!project) notFound();

  const sector = getSector(project.sectorId);
  const evidence = getEvidence(project.evidenceIds);
  const budget = getBudgetFor(project);
  const milestones = getMilestoneTotals(project);
  const overdue = getProjectOverdueDays(project);
  const linkedIssues = listIssues().filter((issue) => issue.projectId === project.id);
  const statusTone = projectStatusTone(project.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/public-projects"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-400 hover:text-cyan-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Public projects
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/city-explorer?feature=project:${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] text-cyan-200 hover:bg-cyan-500/20"
          >
            <MapPin className="h-3 w-3" /> Locate on map
          </Link>
          <Link
            href={`/ai-investigation?project=${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/50 bg-gradient-to-r from-cyan-500 to-sky-500 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-950 hover:brightness-110"
          >
            <Sparkles className="h-3 w-3" /> Investigate
          </Link>
        </div>
      </div>

      <PageHeader
        eyebrow={`${project.code} · Project ledger`}
        title={project.name}
        description={`${project.location}${sector ? ` — ${sector.name}, ${sector.ward}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={severityTone(project.severity)}>{project.severity.toUpperCase()}</Badge>
            <Badge tone={statusTone} dot>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            {overdue > 0 ? <Badge tone="warn">{overdue}d overdue</Badge> : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {/* Money */}
          <Panel glow className="p-4">
            <PanelHeader
              title="Budget position"
              description="Allocation, reported spend, and what independent evidence supports."
            />

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[11px] text-slate-400">
                {formatBdt(project.reportedExpenditureBdt)} reported of{" "}
                {formatBdt(project.allocatedBudgetBdt)} allocated
              </p>
              <p className="font-mono text-sm font-bold text-cyan-200">
                {formatPercent(budget.reportedPercent)}
              </p>
            </div>

            <div className="mt-1.5">
              <SpendBar
                allocated={project.allocatedBudgetBdt}
                reported={project.reportedExpenditureBdt}
                verified={project.verifiedExpenditureBdt}
                height="h-3"
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
                <dt className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Allocated</dt>
                <dd className="mt-0.5 font-mono text-[12px] font-bold text-slate-100">
                  {formatBdtCompact(project.allocatedBudgetBdt)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
                <dt className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Reported</dt>
                <dd className="mt-0.5 font-mono text-[12px] font-bold text-cyan-300">
                  {formatBdtCompact(project.reportedExpenditureBdt)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
                <dt className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Verified</dt>
                <dd
                  className={`mt-0.5 font-mono text-[12px] font-bold ${
                    project.verifiedExpenditureBdt === undefined
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }`}
                >
                  {project.verifiedExpenditureBdt === undefined
                    ? "missing"
                    : formatBdtCompact(project.verifiedExpenditureBdt)}
                </dd>
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 px-2.5 py-2">
                <dt className="font-mono text-[9px] tracking-wider text-amber-300/80 uppercase">Unverified</dt>
                <dd className="mt-0.5 font-mono text-[12px] font-bold text-amber-300">
                  {formatBdtCompact(
                    (project.verifiedExpenditureBdt === undefined
                      ? project.reportedExpenditureBdt
                      : project.reportedExpenditureBdt - project.verifiedExpenditureBdt) || 0
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-3">
              <ProjectSpendChart
                allocated={project.allocatedBudgetBdt}
                reported={project.reportedExpenditureBdt}
                verified={project.verifiedExpenditureBdt}
              />
            </div>
          </Panel>

          {/* Milestones */}
          <Panel className="p-4">
            <PanelHeader
              title="Milestone schedule"
              description={`${milestones.met} met · ${milestones.missed} missed · ${milestones.inProgress} in progress · ${milestones.pending} pending`}
              icon={<CalendarClock className="h-3.5 w-3.5" />}
            />

            <ol className="mt-3 space-y-3 border-l border-slate-800 pl-4">
              {project.milestones.map((milestone) => {
                const tone = MILESTONE_TONE[milestone.status];
                const lateDays =
                  milestone.actualDate && milestone.status === "missed"
                    ? daysBetween(milestone.plannedDate, milestone.actualDate)
                    : 0;

                return (
                  <li key={milestone.id} className="relative">
                    <span
                      className={`absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border border-[#060b14] ${TONES[tone].dot}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold text-slate-100">
                        {milestone.title}
                      </span>
                      <Badge tone={tone}>
                        {milestone.status === "met" ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> met
                          </span>
                        ) : milestone.status === "missed" ? (
                          <span className="inline-flex items-center gap-1">
                            <XCircle className="h-2.5 w-2.5" /> missed
                          </span>
                        ) : (
                          milestone.status
                        )}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> planned {formatDate(milestone.plannedDate)}
                      </span>
                      {milestone.actualDate ? (
                        <span className={lateDays > 0 ? TONES.warn.label : TONES.ok.label}>
                          actual {formatDate(milestone.actualDate)}
                          {lateDays > 0 ? ` (+${lateDays}d)` : ""}
                        </span>
                      ) : milestone.status === "missed" ? (
                        <span className={TONES.danger.label}>never recorded</span>
                      ) : null}
                    </div>
                    {milestone.note ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                        {milestone.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Panel>

          {/* Evidence */}
          <Panel className="p-4">
            <PanelHeader
              title={`Evidence (${evidence.length})`}
              description="Documents, measurements and photographs held against this work."
            />
            <div className="mt-3">
              <EvidenceGallery items={evidence} />
            </div>
          </Panel>

          {/* Linked issues */}
          <Panel className="p-4">
            <PanelHeader
              title={`Linked civic issues (${linkedIssues.length})`}
              description="Citizen reports tied to this location."
              icon={<Wrench className="h-3.5 w-3.5" />}
            />
            {linkedIssues.length === 0 ? (
              <p className="mt-2 rounded-lg border border-slate-800 bg-[#08101d] p-2.5 text-[11px] text-slate-300">
                No civic issue has been recorded against this work.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {linkedIssues.map((issue) => (
                  <li key={issue.id}>
                    <Link
                      href={`/civic-issues/${issue.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[issueStatusTone(issue.status)].dot}`}
                        />
                        <span className="font-mono text-[10px] text-cyan-300">{issue.code}</span>
                        <span className="truncate text-[11px] text-slate-200">{issue.title}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={issueStatusTone(issue.status)}>
                          {ISSUE_STATUS_LABELS[issue.status]}
                        </Badge>
                        <ArrowUpRight className="h-3 w-3 text-slate-500" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <Panel className="p-4">
            <PanelHeader title="Delivery" description="Schedule and verified progress." />
            <div className="mt-3">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>Verified physical progress</span>
                <span className="font-semibold text-slate-200">
                  {project.verifiedProgressPercent}%
                </span>
              </div>
              <ProgressBar
                value={project.verifiedProgressPercent}
                tone={statusTone}
                className="mt-1"
                label={`${project.verifiedProgressPercent} percent verified progress`}
              />
            </div>

            <dl className="mt-3 space-y-0.5">
              <KeyValue
                label="Authority"
                value={<span className="text-[10px] leading-snug">{project.authority}</span>}
              />
              <KeyValue label="Started" value={formatDate(project.startDate)} />
              <KeyValue label="Planned finish" value={formatDate(project.plannedCompletionDate)} />
              <KeyValue
                label="Actual finish"
                value={
                  project.actualCompletionDate ? formatDate(project.actualCompletionDate) : "—"
                }
                tone={project.actualCompletionDate ? "ok" : "neutral"}
              />
              <KeyValue
                label="Overdue"
                value={overdue > 0 ? `${overdue} days` : "on schedule"}
                tone={overdue > 0 ? "warn" : "ok"}
              />
              <KeyValue
                label="Milestone adherence"
                value={formatPercent(milestones.adherencePercent, 0)}
                tone={milestones.adherencePercent >= 80 ? "ok" : "warn"}
              />
            </dl>
          </Panel>

          <Panel className="p-4">
            <PanelHeader title="Procurement" icon={<Building2 className="h-3.5 w-3.5" />} />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              {project.description}
            </p>
            {project.workNote ? (
              <p className="mt-2 rounded border border-slate-800 bg-[#08101d] p-2 font-mono text-[10px] leading-relaxed text-slate-400">
                Work note: {project.workNote}
              </p>
            ) : null}
          </Panel>

          <Panel className="p-4">
            <PanelHeader title="Category" />
            <dl className="mt-2">
              <KeyValue label="Sector" value={sector ? `${sector.code} · ${sector.name}` : project.sectorId} />
              <KeyValue label="Ward" value={sector?.ward ?? "—"} />
              <KeyValue label="Type" value={project.category.replace("-", " ")} />
              <KeyValue label="Location key" value={project.locationKey} />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
