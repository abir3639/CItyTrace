import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  MapPin,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, KeyValue } from "@/components/ui/Data";
import { EvidenceGallery } from "@/components/evidence/EvidenceTile";
import EvidenceCompareSlider from "@/components/evidence/EvidenceCompareSlider";
import CitizenConfirmButton from "@/components/issues/CitizenConfirmButton";
import IssueStatusControls from "@/components/issues/IssueStatusControls";
import {
  evidenceById,
  getIssuesAtLocation as seedIssuesAtLocation,
  getProject,
  getSector,
} from "@/data";
import {
  findIssue,
  findRuntimeEvidence,
  issuesAtLocation as runtimeIssuesAtLocation,
} from "@/lib/issue-store";
import type { Evidence, IssueActor } from "@/types/citytrace";
import { CATEGORY_LABELS, ISSUE_STATUS_LABELS } from "@/types/citytrace";
import {
  TONES,
  formatDate,
  issueStatusTone,
  severityTone,
} from "@/utils/formatters";

export const dynamic = "force-dynamic";

const ACTOR_LABEL: Record<IssueActor, string> = {
  citizen: "Citizen",
  "municipal-desk": "Municipal desk",
  "field-team": "Field team",
  system: "System",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const issue = findIssue(id);
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
  const issue = findIssue(id);

  if (!issue) notFound();

  const sector = getSector(issue.sectorId);
  const project = issue.projectId ? getProject(issue.projectId) : undefined;

  const evidence: Evidence[] = issue.evidenceIds
    .map((evidenceId) => evidenceById.get(evidenceId) ?? findRuntimeEvidence(evidenceId))
    .filter((item): item is Evidence => item !== undefined);

  const allAtLocation = runtimeIssuesAtLocation(issue.locationKey);
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
        <Link
          href={`/city-explorer?feature=issue:${issue.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#007AFF] shadow-sm hover:bg-[#F9FAFB]"
        >
          <MapPin className="h-3.5 w-3.5" />
          Locate on 3D map
        </Link>
      </div>

      <PageHeader
        eyebrow={`${issue.code} · Issue file`}
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
            />
            <p className="mt-3 text-[14px] leading-relaxed text-[#1D1D1F]">
              {issue.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 border-t border-black/[0.06] pt-2 sm:grid-cols-4">
              <KeyValue label="Citizen reports" value={String(issue.reportCount)} />
              <KeyValue label="Status events" value={String(issue.history.length)} />
              <KeyValue label="Evidence" value={String(evidence.length)} />
              <KeyValue
                label="Resolved"
                value={issue.resolvedAt ? formatDate(issue.resolvedAt) : "Open"}
                tone={issue.resolvedAt ? "ok" : "warn"}
              />
            </dl>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="Permanent History"
              description="Resolving an issue never deletes it — every status transition remains on record."
              icon={<Clock className="h-4 w-4" />}
            />
            <ol className="mt-4 space-y-4 border-l border-black/[0.08] pl-4">
              {issue.history.map((event, index) => {
                const eventTone = issueStatusTone(event.status);
                const isLast = index === issue.history.length - 1;
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${TONES[eventTone].dot}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-medium text-[#6E6E73] tabular-nums">
                        {formatDate(event.at)}
                      </span>
                      <Badge tone={eventTone}>{ISSUE_STATUS_LABELS[event.status]}</Badge>
                      <span className="text-[11.5px] font-medium text-[#6E6E73]">
                        {ACTOR_LABEL[event.actor]}
                      </span>
                      {isLast ? (
                        <span className="rounded-full bg-[#007AFF]/[0.1] px-2 py-0.5 text-[10.5px] font-semibold text-[#0055CC]">
                          Latest
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#48484A]">
                      {event.note}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title={`Evidence (${evidence.length})`}
              description="Supporting documents, photos, and verification status."
            />
            <div className="mt-3 flex flex-col gap-4">
              {evidence.length >= 2 ? <EvidenceCompareSlider items={evidence} /> : null}
              <EvidenceGallery items={evidence} />
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

        <div className="flex flex-col gap-5">
          <Panel className="p-5">
            <PanelHeader
              title="Citizen Verification"
              description="Confirm if this problem still exists or has returned after repair."
            />
            <div className="mt-3.5">
              <CitizenConfirmButton
                issueId={issue.id}
                reportCount={issue.reportCount}
                status={issue.status}
              />
            </div>
          </Panel>

          <Panel glow className="p-5">
            <PanelHeader
              title="Issue Management"
              description="Updates append to the permanent history."
            />
            <div className="mt-3.5">
              <IssueStatusControls issueId={issue.id} currentStatus={issue.status} />
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader title="Location Metadata" />
            <dl className="mt-2">
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
                title="No linked project"
                description="No sanctioned public work has been attached to this location yet."
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
