import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Clock,
  MapPin,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, KeyValue } from "@/components/ui/Data";
import { CopyLinkButton } from "@/components/ui/ExportActions";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import EvidenceCompareSlider from "@/components/evidence/EvidenceCompareSlider";
import EvidenceGalleryClient from "@/components/evidence/EvidenceGalleryClient";
import AccountabilityTimeline from "@/components/governance/AccountabilityTimeline";
import FollowButton from "@/components/governance/FollowButton";
import IssueGovernanceConsole from "@/components/governance/IssueGovernanceConsole";
import CitizenConfirmButton from "@/components/issues/CitizenConfirmButton";
import {
  getIssuesAtLocation as seedIssuesAtLocation,
  getProject,
  getSector,
} from "@/data";
import { getCurrentUser, isDemoModeEnabled } from "@/lib/auth-store";
import { getDepartmentForIssue } from "@/lib/departments";
import { getUserWatchlist } from "@/lib/governance-store";
import {
  findIssue,
  issuesAtLocation as runtimeIssuesAtLocation,
  listAllEvidence,
} from "@/lib/issue-store";
import { deriveIssueSla } from "@/lib/sla";
import type { Evidence } from "@/types/citytrace";
import { CATEGORY_LABELS, ISSUE_STATUS_LABELS } from "@/types/citytrace";
import {
  TONES,
  formatDate,
  issueStatusTone,
  severityTone,
} from "@/utils/formatters";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const issue = await findIssue(id);
  return {
    title: issue ? `${issue.code} · Civic Issues · CityTrace` : "Issue not found · CityTrace",
  };
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await findIssue(id);

  if (!issue) notFound();

  const currentUser = await getCurrentUser();
  const demoEnabled = isDemoModeEnabled();
  const watchlist = currentUser
    ? await getUserWatchlist(currentUser.id)
    : { issues: [], sectors: [], projects: [] };
  const isFollowing = watchlist.issues.includes(issue.id);

  const sector = getSector(issue.sectorId);
  const dept = getDepartmentForIssue(issue);
  const sla = deriveIssueSla(issue);
  const project = issue.projectId ? getProject(issue.projectId) : undefined;

  const allEvidenceMap = new Map((await listAllEvidence()).map((item) => [item.id, item]));
  const evidence: Evidence[] = issue.evidenceIds
    .map((evidenceId) => allEvidenceMap.get(evidenceId))
    .filter((item): item is Evidence => item !== undefined);

  const allAtLocation = await runtimeIssuesAtLocation(issue.locationKey);
  const atLocation =
    allAtLocation.length > 0 ? allAtLocation : seedIssuesAtLocation(issue.locationKey);
  const others = atLocation.filter((item) => item.id !== issue.id);
  const tone = issueStatusTone(issue.status);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/civic-issues"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Civic Issue Register
        </Link>
        <div className="print-hidden flex flex-wrap items-center gap-2">
          <FollowButton
            entityType="issue"
            entityId={issue.id}
            initialFollowing={isFollowing}
            signedIn={Boolean(currentUser)}
            loginNext={`/civic-issues/${issue.id}`}
          />
          <CopyLinkButton />
          <Link
            href={`/city-explorer?feature=issue:${issue.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#007AFF] shadow-sm hover:bg-[#F9FAFB]"
          >
            <MapPin className="h-3.5 w-3.5" />
            Locate on 3D map
          </Link>
        </div>
      </div>

      <PageHeader
        eyebrow={`${issue.code} · ${dept.shortName}`}
        title={issue.title}
        description={`${issue.location}${sector ? ` — ${sector.name}, ${sector.ward}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={severityTone(issue.severity)}>
              {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
            </Badge>
            <Badge tone={tone} dot>
              {ISSUE_STATUS_LABELS[issue.status]}
            </Badge>
            <Badge tone={sla.tone}>{sla.label}</Badge>
            <Badge tone="neutral">{CATEGORY_LABELS[issue.category]}</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <Panel className="p-5">
            <PanelHeader
              title="Reported Problem"
              description={`Filed ${formatDate(issue.reportedAt)} · last updated ${formatDate(issue.updatedAt)}`}
              actions={
                issue.reportedBy ? (
                  <div className="flex items-center gap-2 rounded-full border border-black/[0.07] bg-[#F5F5F7] py-1 pl-1 pr-2.5">
                    <UserAvatar
                      initials={issue.reportedBy.initials}
                      color={issue.reportedBy.avatarColor}
                      size="xs"
                    />
                    <span className="text-[12px] font-medium text-[#1D1D1F]">
                      {issue.reportedBy.name}
                    </span>
                    <RolePill role={issue.reportedBy.role} />
                  </div>
                ) : null
              }
            />
            <p className="mt-3 text-[14px] leading-relaxed text-[#1D1D1F]">
              {issue.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 border-t border-black/[0.06] pt-2 sm:grid-cols-4">
              <KeyValue label="Confirmations" value={String(issue.reportCount)} />
              <KeyValue
                label="Audit events"
                value={String(issue.accountabilityTimeline?.length ?? issue.history.length)}
              />
              <KeyValue label="Evidence" value={String(evidence.length)} />
              <KeyValue
                label="Resolution"
                value={
                  issue.resolvedAt
                    ? issue.resolutionVerification === "verified"
                      ? `Verified · ${formatDate(issue.resolvedAt)}`
                      : `Legacy · ${formatDate(issue.resolvedAt)}`
                    : "Open"
                }
                tone={
                  issue.resolvedAt
                    ? issue.resolutionVerification === "verified"
                      ? "ok"
                      : "neutral"
                    : "warn"
                }
              />
            </dl>
          </Panel>

          {/* Official Department Response & SLA Card */}
          <Panel className="p-5">
            <PanelHeader
              title="Department Response & SLA Schedule"
              description={`Assigned to ${dept.name}`}
              icon={<Building2 className="h-4 w-4" />}
              actions={<Badge tone={sla.tone}>{sla.label}</Badge>}
            />
            {issue.officialResponse ? (
              <div className="mt-3.5 space-y-3">
                <div className="rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#1D1D1F]">
                      <UserAvatar
                        initials={issue.officialResponse.respondedBy.initials}
                        color={issue.officialResponse.respondedBy.avatarColor}
                        size="xs"
                      />
                      {issue.officialResponse.respondedBy.name}
                      <RolePill role={issue.officialResponse.respondedBy.role} />
                    </span>
                    <span className="text-[#6E6E73] tabular-nums">
                      {formatDate(issue.officialResponse.respondedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#1D1D1F]">
                    {issue.officialResponse.message}
                  </p>
                </div>

                <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
                  <KeyValue
                    label="Assigned team"
                    value={issue.assignedTeam ?? "General crew"}
                  />
                  <KeyValue
                    label="Work-order ref"
                    value={issue.workOrderRef ?? "Unassigned"}
                  />
                  <KeyValue
                    label="Target repair date"
                    value={
                      issue.estimatedRepairDate ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-[#007AFF]" />
                          {formatDate(issue.estimatedRepairDate)}
                        </span>
                      ) : (
                        "Not scheduled"
                      )
                    }
                    tone={sla.state === "overdue" ? "danger" : undefined}
                  />
                </dl>
              </div>
            ) : (
              <p className="mt-3 rounded-[14px] bg-[#F5F5F7] px-3.5 py-3 text-[13px] text-[#6E6E73]">
                Awaiting formal official response and estimated repair deadline from{" "}
                <span className="font-medium text-[#1D1D1F]">{dept.shortName}</span>.
              </p>
            )}
          </Panel>

          {/* Repair Cycles History (kept distinct per attempt) */}
          {issue.repairAttempts && issue.repairAttempts.length > 0 ? (
            <Panel className="p-5">
              <PanelHeader
                title={`Repair Attempts & Independent Inspections (${issue.repairAttempts.length})`}
                description="Historical repair attempts are preserved separately from active work."
                icon={<Wrench className="h-4 w-4" />}
              />
              <ul className="mt-3.5 space-y-2.5">
                {issue.repairAttempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
                        Attempt #{attempt.attemptNumber} · Completed{" "}
                        {formatDate(attempt.completionDate)}
                        {attempt.workOrderRef ? ` · ${attempt.workOrderRef}` : ""}
                      </span>
                      {attempt.verification ? (
                        <Badge
                          tone={
                            attempt.verification.decision === "approved"
                              ? "ok"
                              : "danger"
                          }
                        >
                          {attempt.verification.decision === "approved"
                            ? "Certified Approved"
                            : "Rejected on Inspection"}
                        </Badge>
                      ) : (
                        <Badge tone="warn">Pending Independent Inspection</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] text-[#48484A]">
                      {attempt.resolutionNotes}
                    </p>
                    {attempt.verification ? (
                      <p className="mt-2 rounded-[10px] border border-black/[0.05] bg-white px-2.5 py-2 text-[12px] text-[#48484A]">
                        <span className="font-semibold text-[#1D1D1F]">
                          {attempt.verification.verifiedBy.name}
                        </span>{" "}
                        ({formatDate(attempt.verification.verifiedAt)}): “
                        {attempt.verification.notes}”
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel className="p-5">
            <PanelHeader
              title="Public Accountability Timeline"
              description="Append-only record of every report, verification, department response, SLA revision, and inspection."
              icon={<Clock className="h-4 w-4" />}
            />
            <div className="mt-4">
              <AccountabilityTimeline events={issue.accountabilityTimeline ?? []} />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title={`Evidence Gallery (${evidence.length})`}
              description="Supporting documents, photos, uploader attribution, and Civic Verifier moderation."
            />
            <div className="mt-3 flex flex-col gap-4">
              {evidence.length >= 2 ? <EvidenceCompareSlider items={evidence} /> : null}
              <EvidenceGalleryClient items={evidence} currentUser={currentUser} />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="Previous Reports at This Location"
              description="Separate reports tied to the exact same physical location."
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            {others.length === 0 ? (
              <p className="mt-3 rounded-[14px] bg-[#F5F5F7] p-3.5 text-[13px] text-[#6E6E73]">
                This is the only report on file for this location. If the problem returns after
                resolution, future reports link here automatically.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {others.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/civic-issues/${other.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] px-3.5 py-3 transition-colors hover:bg-[#F0F2F5]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${TONES[issueStatusTone(other.status)].dot}`}
                        />
                        <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                          {other.code}
                        </span>
                        <span className="truncate text-[13px] font-medium text-[#1D1D1F]">
                          {other.title}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-[12px] text-[#6E6E73] tabular-nums">
                        {formatDate(other.reportedAt)}
                        <Badge tone={issueStatusTone(other.status)}>
                          {ISSUE_STATUS_LABELS[other.status]}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right rail: Verification votes + Governance Workflow + Metadata */}
        <div className="flex flex-col gap-5">
          <Panel glow className="p-5">
            <PanelHeader
              title="Issue Governance & Workflow"
              description="Role-restricted transitions with mandatory accountability records."
            />
            <div className="mt-3.5">
              <IssueGovernanceConsole
                issue={issue}
                currentUser={currentUser}
                demoEnabled={demoEnabled}
              />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="Citizen Verification"
              description="Confirm if this problem still exists on site."
            />
            <div className="mt-3.5">
              <CitizenConfirmButton
                issueId={issue.id}
                reportCount={issue.reportCount}
                status={issue.status}
                votes={issue.votes ?? []}
                currentUser={currentUser}
                demoEnabled={demoEnabled}
              />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader title="Location & Routing Metadata" />
            <dl className="mt-2">
              <KeyValue label="Department" value={`${dept.code} · ${dept.shortName}`} />
              <KeyValue
                label="Sector"
                value={sector ? `${sector.code} · ${sector.name}` : issue.sectorId}
              />
              <KeyValue label="Ward" value={sector?.ward ?? "—"} />
              <KeyValue
                label="Coordinates"
                value={`${issue.coordinates[0]}, ${issue.coordinates[1]}`}
              />
              <KeyValue label="Location key" value={issue.locationKey} />
            </dl>
          </Panel>

          {project ? (
            <Panel className="p-5">
              <PanelHeader
                title="Related Project"
                description="Sanctioned work associated with this location."
                icon={<Wrench className="h-4 w-4" />}
              />
              <Link
                href={`/public-projects/${project.id}`}
                className="mt-3 block rounded-[14px] bg-[#F5F5F7] p-3.5 transition-colors hover:bg-[#EBEEF3]"
              >
                <p className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                  {project.code}
                </p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-[#1D1D1F]">
                  {project.name}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-[#007AFF]">
                  View project ledger <ArrowUpRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            </Panel>
          ) : (
            <Panel className="p-5">
              <EmptyState
                title="Routine maintenance"
                description="No sanctioned capital work has been attached to this location."
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
