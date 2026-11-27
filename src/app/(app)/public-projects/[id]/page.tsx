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
import EvidenceGalleryClient from "@/components/evidence/EvidenceGalleryClient";
import EvidenceCompareSlider from "@/components/evidence/EvidenceCompareSlider";
import FollowButton from "@/components/governance/FollowButton";
import { CopyLinkButton, PrintDossierButton } from "@/components/ui/ExportActions";
import { ProjectSpendChart } from "@/components/money/MoneyCharts";
import { getSector, projectsById } from "@/data";
import { getCurrentUser } from "@/lib/auth-store";
import { getUserWatchlist } from "@/lib/governance-store";
import { listAllEvidence, listIssues } from "@/lib/issue-store";
import {
  getBudgetFor,
  getMilestoneTotals,
  getProjectCivicOutcome,
  getProjectOverdueDays,
} from "@/lib/stats";
import { ISSUE_STATUS_LABELS, PROJECT_STATUS_LABELS } from "@/types/citytrace";
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
      ? `${project.code} · Public Projects · CityTrace`
      : "Project not found · CityTrace",
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

  const currentUser = await getCurrentUser();
  const watchlist = currentUser
    ? getUserWatchlist(currentUser.id)
    : { issues: [], sectors: [], projects: [] };
  const isFollowing = watchlist.projects.includes(project.id);

  const sector = getSector(project.sectorId);
  const allIssues = listIssues();
  const allEvidence = listAllEvidence();
  const evidenceMap = new Map(allEvidence.map((item) => [item.id, item]));
  const evidence = project.evidenceIds
    .map((eid) => evidenceMap.get(eid))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  const budget = getBudgetFor(project);
  const milestones = getMilestoneTotals(project);
  const overdue = getProjectOverdueDays(project);
  const outcome = getProjectCivicOutcome(project, allIssues, allEvidence);
  const linkedIssues = outcome.linkedIssues;
  const statusTone = projectStatusTone(project.status);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/public-projects"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Public Projects
        </Link>
        <div className="print-hidden flex flex-wrap items-center gap-2">
          <FollowButton
            entityType="project"
            entityId={project.id}
            initialFollowing={isFollowing}
            signedIn={Boolean(currentUser)}
            loginNext={`/public-projects/${project.id}`}
          />
          <CopyLinkButton />
          <PrintDossierButton />
          <Link
            href={`/city-explorer?feature=project:${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] shadow-sm hover:bg-[#F9FAFB]"
          >
            <MapPin className="h-3.5 w-3.5 text-[#007AFF]" /> Locate on 3D map
          </Link>
          <Link
            href={`/ai-investigation?project=${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-sm hover:bg-[#0066D6]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Investigate
          </Link>
        </div>
      </div>

      <PageHeader
        eyebrow={`${project.code} · Project ledger`}
        title={project.name}
        description={`${project.location}${sector ? ` — ${sector.name}, ${sector.ward}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={severityTone(project.severity)}>
              {project.severity.charAt(0).toUpperCase() + project.severity.slice(1)}
            </Badge>
            <Badge tone={statusTone} dot>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            {overdue > 0 ? <Badge tone="warn">{overdue}d overdue</Badge> : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <Panel glow className="p-5">
            <PanelHeader
              title="Budget Position"
              description="Sanctioned allocation, reported expenditure, and independently verified spend."
            />

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-[#48484A] tabular-nums">
                {formatBdt(project.reportedExpenditureBdt)} reported of{" "}
                {formatBdt(project.allocatedBudgetBdt)} allocated
              </p>
              <p className="text-[15px] font-semibold text-[#0055CC] tabular-nums">
                {formatPercent(budget.reportedPercent)}
              </p>
            </div>

            <div className="mt-2">
              <SpendBar
                allocated={project.allocatedBudgetBdt}
                reported={project.reportedExpenditureBdt}
                verified={project.verifiedExpenditureBdt}
                height="h-3"
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="ct-surface-inset rounded-[14px] px-3.5 py-2.5">
                <dt className="text-[11.5px] text-[#6E6E73]">Allocated</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-[#1D1D1F] tabular-nums">
                  {formatBdtCompact(project.allocatedBudgetBdt)}
                </dd>
              </div>
              <div className="ct-surface-inset rounded-[14px] px-3.5 py-2.5">
                <dt className="text-[11.5px] text-[#6E6E73]">Reported</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-[#0055CC] tabular-nums">
                  {formatBdtCompact(project.reportedExpenditureBdt)}
                </dd>
              </div>
              <div className="ct-surface-inset rounded-[14px] px-3.5 py-2.5">
                <dt className="text-[11.5px] text-[#6E6E73]">Verified</dt>
                <dd
                  className={`mt-0.5 text-[15px] font-semibold tabular-nums ${
                    project.verifiedExpenditureBdt === undefined
                      ? "text-[#B25000]"
                      : "text-[#1A7F37]"
                  }`}
                >
                  {project.verifiedExpenditureBdt === undefined
                    ? "Missing"
                    : formatBdtCompact(project.verifiedExpenditureBdt)}
                </dd>
              </div>
              <div className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.08] px-3.5 py-2.5">
                <dt className="text-[11.5px] text-[#B25000]">Unverified</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-[#B25000] tabular-nums">
                  {formatBdtCompact(
                    (project.verifiedExpenditureBdt === undefined
                      ? project.reportedExpenditureBdt
                      : project.reportedExpenditureBdt - project.verifiedExpenditureBdt) || 0
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <ProjectSpendChart
                allocated={project.allocatedBudgetBdt}
                reported={project.reportedExpenditureBdt}
                verified={project.verifiedExpenditureBdt}
              />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="Civic Outcome & Accountability Chain"
              description="Distinguishes financial disbursement from independently verified street outcomes."
              icon={<Wrench className="h-4 w-4" />}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11.5px] font-medium">
              <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-1 font-semibold text-[#0055CC]">
                1. {project.code} ({formatPercent(budget.reportedPercent, 0)} spent)
              </span>
              <span className="text-[#86868B]">→</span>
              <span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[#1D1D1F] tabular-nums">
                2. Work Orders ({outcome.workOrders.length})
              </span>
              <span className="text-[#86868B]">→</span>
              <span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[#1D1D1F] tabular-nums">
                3. Civic Issues ({outcome.linkedIssues.length})
              </span>
              <span className="text-[#86868B]">→</span>
              <span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[#1D1D1F] tabular-nums">
                4. Evidence ({outcome.verifiedEvidenceCount}/{outcome.repairEvidenceCount} verified)
              </span>
              <span className="text-[#86868B]">→</span>
              <span className="rounded-full bg-[#34C759]/[0.12] px-2.5 py-1 font-semibold text-[#1A7F37] tabular-nums">
                5. Verified Outcomes ({outcome.verifiedRepairsCount})
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <div className="ct-surface-inset rounded-[12px] px-3 py-2">
                <dt className="text-[11px] text-[#6E6E73]">Active repairs</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[#0055CC] tabular-nums">
                  {outcome.activeRepairsCount}
                </dd>
              </div>
              <div className="ct-surface-inset rounded-[12px] px-3 py-2">
                <dt className="text-[11px] text-[#6E6E73]">Overdue</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[#C9241B] tabular-nums">
                  {outcome.overdueRepairsCount}
                </dd>
              </div>
              <div className="ct-surface-inset rounded-[12px] px-3 py-2">
                <dt className="text-[11px] text-[#6E6E73]">Awaiting verify</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[#B25000] tabular-nums">
                  {outcome.awaitingVerificationCount}
                </dd>
              </div>
              <div className="ct-surface-inset rounded-[12px] px-3 py-2">
                <dt className="text-[11px] text-[#6E6E73]">Verified fixes</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[#1A7F37] tabular-nums">
                  {outcome.verifiedRepairsCount}
                </dd>
              </div>
              <div className="ct-surface-inset rounded-[12px] px-3 py-2">
                <dt className="text-[11px] text-[#6E6E73]">Reopened / failed</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[#C9241B] tabular-nums">
                  {outcome.reopenedOrFailedCount}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="text-[#6E6E73]">
                {outcome.workOrders.length > 0
                  ? `Work orders: ${outcome.workOrders.join(", ")}`
                  : "No digital work-order ref linked yet"}
              </span>
              <Link
                href={`/ai-investigation?project=${project.id}`}
                className="font-semibold text-[#007AFF] hover:underline"
              >
                Inspect linked findings →
              </Link>
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="Milestone Schedule"
              description={`${milestones.met} met · ${milestones.missed} missed · ${milestones.inProgress} in progress · ${milestones.pending} pending`}
              icon={<CalendarClock className="h-4 w-4" />}
            />

            <ol className="mt-4 space-y-4 border-l border-black/[0.08] pl-4">
              {project.milestones.map((milestone) => {
                const tone = MILESTONE_TONE[milestone.status];
                const lateDays =
                  milestone.actualDate && milestone.status === "missed"
                    ? daysBetween(milestone.plannedDate, milestone.actualDate)
                    : 0;

                return (
                  <li key={milestone.id} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${TONES[tone].dot}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1D1D1F]">
                        {milestone.title}
                      </span>
                      <Badge tone={tone}>
                        {milestone.status === "met" ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Met
                          </span>
                        ) : milestone.status === "missed" ? (
                          <span className="inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Missed
                          </span>
                        ) : (
                          milestone.status
                        )}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#6E6E73] tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Planned {formatDate(milestone.plannedDate)}
                      </span>
                      {milestone.actualDate ? (
                        <span className={lateDays > 0 ? TONES.warn.label : TONES.ok.label}>
                          Actual {formatDate(milestone.actualDate)}
                          {lateDays > 0 ? ` (+${lateDays}d)` : ""}
                        </span>
                      ) : milestone.status === "missed" ? (
                        <span className={TONES.danger.label}>Never recorded</span>
                      ) : null}
                    </div>
                    {milestone.note ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-[#48484A]">
                        {milestone.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title={`Evidence (${evidence.length})`}
              description="Documents, measurements, and site photographs attached to this project."
            />
            <div className="mt-3 flex flex-col gap-4">
              {evidence.length >= 2 ? <EvidenceCompareSlider items={evidence} /> : null}
              <EvidenceGalleryClient items={evidence} currentUser={currentUser} />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title={`Linked Civic Issues (${linkedIssues.length})`}
              description="Citizen reports linked to this location."
              icon={<Wrench className="h-4 w-4" />}
            />
            {linkedIssues.length === 0 ? (
              <p className="mt-3 rounded-[14px] bg-[#F5F5F7] p-3.5 text-[13px] text-[#6E6E73]">
                No civic issue has been recorded against this work.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {linkedIssues.map((issue) => (
                  <li key={issue.id}>
                    <Link
                      href={`/civic-issues/${issue.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] px-3.5 py-3 transition-colors hover:bg-[#F0F2F5]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${TONES[issueStatusTone(issue.status)].dot}`}
                        />
                        <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                          {issue.code}
                        </span>
                        <span className="truncate text-[13px] font-medium text-[#1D1D1F]">
                          {issue.title}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={issueStatusTone(issue.status)}>
                          {ISSUE_STATUS_LABELS[issue.status]}
                        </Badge>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#86868B]" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel className="p-5">
            <PanelHeader title="Delivery Summary" description="Schedule and verified progress." />
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[12.5px] text-[#6E6E73]">
                <span>Verified physical progress</span>
                <span className="font-semibold text-[#1D1D1F] tabular-nums">
                  {project.verifiedProgressPercent}%
                </span>
              </div>
              <ProgressBar
                value={project.verifiedProgressPercent}
                tone={statusTone}
                className="mt-1.5"
                label={`${project.verifiedProgressPercent} percent verified progress`}
              />
            </div>

            <dl className="mt-4">
              <KeyValue
                label="Authority"
                value={<span className="text-[12px] leading-snug">{project.authority}</span>}
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
                label="Schedule status"
                value={overdue > 0 ? `${overdue} days overdue` : "On schedule"}
                tone={overdue > 0 ? "warn" : "ok"}
              />
              <KeyValue
                label="Milestone adherence"
                value={formatPercent(milestones.adherencePercent, 0)}
                tone={milestones.adherencePercent >= 80 ? "ok" : "warn"}
              />
            </dl>
          </Panel>

          <Panel className="p-5">
            <PanelHeader title="Scope & Notes" icon={<Building2 className="h-4 w-4" />} />
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#48484A]">
              {project.description}
            </p>
            {project.workNote ? (
              <p className="mt-3 rounded-[12px] bg-[#F5F5F7] p-3 text-[12px] leading-relaxed text-[#6E6E73]">
                Work note: {project.workNote}
              </p>
            ) : null}
          </Panel>

          <Panel className="p-5">
            <PanelHeader title="Classification" />
            <dl className="mt-2">
              <KeyValue
                label="Sector"
                value={sector ? `${sector.code} · ${sector.name}` : project.sectorId}
              />
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
