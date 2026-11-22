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
import IssueStatusControls from "@/components/issues/IssueStatusControls";
import { evidenceById, getIssuesAtLocation as seedIssuesAtLocation, getProject, getSector } from "@/data";
import { findIssue, findRuntimeEvidence, issuesAtLocation as runtimeIssuesAtLocation } from "@/lib/issue-store";
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
    title: issue ? `${issue.code} · Civic Issues · CITYTRACE` : "Issue not found · CITYTRACE",
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

  // Runtime store covers citizen reports; the seed helper covers seeded issues.
  const allAtLocation = runtimeIssuesAtLocation(issue.locationKey);
  const atLocation = allAtLocation.length > 0 ? allAtLocation : seedIssuesAtLocation(issue.locationKey);
  const others = atLocation.filter((item) => item.id !== issue.id);
  const tone = issueStatusTone(issue.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/civic-issues"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-400 hover:text-cyan-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Civic issue register
        </Link>
        <Link
          href={`/city-explorer?feature=issue:${issue.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] text-cyan-200 hover:bg-cyan-500/20"
        >
          <MapPin className="h-3 w-3" />
          Locate on city map
        </Link>
      </div>

      <PageHeader
        eyebrow={`${issue.code} · Issue file`}
        title={issue.title}
        description={`${issue.location}${sector ? ` — ${sector.name}, ${sector.ward}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={severityTone(issue.severity)}>{issue.severity.toUpperCase()}</Badge>
            <Badge tone={tone} dot>
              {ISSUE_STATUS_LABELS[issue.status]}
            </Badge>
            <Badge tone="neutral">{CATEGORY_LABELS[issue.category]}</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Panel className="p-4">
            <PanelHeader
              title="Reported problem"
              description={`Filed ${formatDate(issue.reportedAt)} · last updated ${formatDate(issue.updatedAt)}`}
            />
            <p className="mt-2 text-[12px] leading-relaxed text-slate-200">
              {issue.description}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t border-slate-800 pt-2 sm:grid-cols-4">
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

          <Panel className="p-4">
            <PanelHeader
              title="Permanent history"
              description="Resolving an issue never deletes it — every status change stays on the record."
              icon={<Clock className="h-3.5 w-3.5" />}
            />
            <ol className="mt-3 space-y-3 border-l border-slate-800 pl-4">
              {issue.history.map((event, index) => {
                const eventTone = issueStatusTone(event.status);
                const isLast = index === issue.history.length - 1;
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border border-[#060b14] ${TONES[eventTone].dot}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        {formatDate(event.at)}
                      </span>
                      <Badge tone={eventTone}>{ISSUE_STATUS_LABELS[event.status]}</Badge>
                      <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                        {ACTOR_LABEL[event.actor]}
                      </span>
                      {isLast ? (
                        <span className="font-mono text-[9px] tracking-wider text-cyan-400 uppercase">
                          latest
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                      {event.note}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel className="p-4">
            <PanelHeader
              title={`Evidence (${evidence.length})`}
              description="What supports this report — and whether anyone has verified it."
            />
            <div className="mt-3">
              <EvidenceGallery items={evidence} />
            </div>
          </Panel>

          <Panel className="p-4">
            <PanelHeader
              title="Previous reports at this location"
              description="The same physical spot, reported more than once."
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
            />
            {others.length === 0 ? (
              <p className="mt-2 rounded-lg border border-slate-800 bg-[#08101d] p-2.5 text-[11px] text-slate-300">
                This is the only report on file for this location. If the problem
                returns after it is closed, it will be linked here as a reopening.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {others.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/civic-issues/${other.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[issueStatusTone(other.status)].dot}`}
                        />
                        <span className="font-mono text-[10px] text-cyan-300">{other.code}</span>
                        <span className="truncate text-[11px] text-slate-200">{other.title}</span>
                      </span>
                      <span className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
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

        <div className="flex flex-col gap-4">
          <Panel glow className="p-4">
            <PanelHeader
              title="Issue management"
              description="Changes are recorded permanently, not overwritten."
            />
            <div className="mt-3">
              <IssueStatusControls issueId={issue.id} currentStatus={issue.status} />
            </div>
          </Panel>

          <Panel className="p-4">
            <PanelHeader title="Where" />
            <dl className="mt-2">
              <KeyValue label="Sector" value={sector ? `${sector.code} · ${sector.name}` : issue.sectorId} />
              <KeyValue label="Ward" value={sector?.ward ?? "—"} />
              <KeyValue label="Coordinates" value={`${issue.coordinates[0]}, ${issue.coordinates[1]}`} />
              <KeyValue label="Location key" value={issue.locationKey} />
            </dl>
          </Panel>

          {project ? (
            <Panel className="p-4">
              <PanelHeader
                title="Related project"
                description="The sanctioned work attached to this location."
                icon={<Wrench className="h-3.5 w-3.5" />}
              />
              <Link
                href={`/public-projects/${project.id}`}
                className="mt-2 block rounded-lg border border-slate-800 bg-[#08101d] p-2.5 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
              >
                <p className="font-mono text-[10px] text-cyan-300">{project.code}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-100">{project.name}</p>
                <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-400">
                  View project ledger <ArrowUpRight className="h-3 w-3" />
                </p>
              </Link>
            </Panel>
          ) : (
            <Panel className="p-4">
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
