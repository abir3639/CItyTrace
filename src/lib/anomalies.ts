import { EVIDENCE, ISSUES, PROJECTS } from "@/data";
import type { Evidence, Issue } from "@/types/citytrace";
import { getDepartmentForIssue } from "./departments";
import { deriveIssueSla } from "./sla";
import {
  DEMO_NOW,
  clusterByLocation,
  getMilestoneTotals,
  getProjectOverdueDays,
} from "./stats";
import { formatBdtCompact, formatDate, formatPercent } from "@/utils/formatters";

/**
 * Deterministic Automated Accountability Engine (Civic Accountability V2).
 *
 * All findings are rule-based observations backed by stored evidence, timelines,
 * and SLA calculations. They highlight operational risk and missing records —
 * never allegations of corruption, fraud, or misconduct.
 */

export type AnomalyKind =
  | "spend"
  | "progress"
  | "schedule"
  | "milestone"
  | "evidence"
  | "recurrence"
  | "overdue_repair"
  | "missing_response"
  | "failed_verification"
  | "repeated_reopen"
  | "insufficient_evidence"
  | "frequent_extensions"
  | "delayed_verification"
  | "flagged_evidence"
  | "project_issue_cluster";

export type AnomalySeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

export interface AnomalyFinding {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  detail: string;
  triggerRule: string;
  detectedAt: string;
  suggestedAction: string;
  status: "open" | "resolved";
  /** Underlying records, so the UI can link straight to them. */
  projectId?: string;
  sectorId?: string;
  issueIds: string[];
  confidence: number;
}

const KIND_LABEL: Record<AnomalyKind, string> = {
  spend: "Unverified spending",
  progress: "Progress vs spend",
  schedule: "Project schedule",
  milestone: "Milestone drift",
  evidence: "Evidence gap",
  recurrence: "Recurring failure",
  overdue_repair: "Overdue repair SLA",
  missing_response: "Missing official response",
  failed_verification: "Failed repair verification",
  repeated_reopen: "Repeatedly reopened",
  insufficient_evidence: "Unverified resolution",
  frequent_extensions: "Frequent deadline changes",
  delayed_verification: "Delayed verification",
  flagged_evidence: "Flagged evidence",
  project_issue_cluster: "Project issue cluster",
};

export function anomalyKindLabel(kind: AnomalyKind): string {
  return KIND_LABEL[kind];
}

const BASE_CONFIDENCE: Record<AnomalyKind, number> = {
  spend: 90,
  progress: 88,
  schedule: 94,
  milestone: 76,
  evidence: 82,
  recurrence: 88,
  overdue_repair: 96,
  missing_response: 89,
  failed_verification: 95,
  repeated_reopen: 91,
  insufficient_evidence: 84,
  frequent_extensions: 86,
  delayed_verification: 92,
  flagged_evidence: 93,
  project_issue_cluster: 87,
};

const SEVERITY_RANK: Record<AnomalySeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4,
};

export function findAnomalies(
  issues: Issue[] = ISSUES,
  evidenceList: Evidence[] = EVIDENCE
): AnomalyFinding[] {
  const seenIds = new Set<string>();
  const findings: AnomalyFinding[] = [];
  const evidenceById = new Map(evidenceList.map((e) => [e.id, e]));

  const push = (
    entityKey: string,
    finding: Omit<AnomalyFinding, "id" | "confidence" | "detectedAt" | "status"> & {
      confidence?: number;
      detectedAt?: string;
      status?: "open" | "resolved";
    }
  ) => {
    const id = `${finding.kind}:${entityKey}`;
    if (seenIds.has(id)) return;
    seenIds.add(id);
    findings.push({
      ...finding,
      id,
      detectedAt: finding.detectedAt ?? DEMO_NOW,
      status: finding.status ?? "open",
      confidence: finding.confidence ?? BASE_CONFIDENCE[finding.kind],
    });
  };

  /* --------------------------- Project Rules --------------------------- */
  for (const project of PROJECTS) {
    const allocated = project.allocatedBudgetBdt;
    const reported = project.reportedExpenditureBdt;
    const verified = project.verifiedExpenditureBdt;
    const reportedPct = allocated > 0 ? (reported / allocated) * 100 : 0;
    const unverified =
      verified === undefined ? reported : Math.max(0, reported - verified);
    const unverifiedPct = allocated > 0 ? (unverified / allocated) * 100 : 0;
    const gap = reportedPct - project.verifiedProgressPercent;
    const overdue = getProjectOverdueDays(project);
    const milestones = getMilestoneTotals(project);

    if (unverifiedPct > 10) {
      push(project.id, {
        kind: "spend",
        severity: unverifiedPct > 60 ? "high" : unverifiedPct > 25 ? "medium" : "low",
        title: `${project.code}: ${formatPercent(unverifiedPct)} of allocation is unverified`,
        detail:
          verified === undefined
            ? `${formatBdtCompact(reported)} is reported as spent with no independently verified financial record on file.`
            : `${formatBdtCompact(unverified)} of the ${formatBdtCompact(reported)} reported as spent lacks independent financial verification.`,
        triggerRule: "Rule F-01 · Unverified disbursement share > 10%",
        suggestedAction: "Attach certified measurement bills or independent audit vouchers.",
        projectId: project.id,
        sectorId: project.sectorId,
        issueIds: [],
      });
    }

    if (gap > 20) {
      push(project.id, {
        kind: "progress",
        severity: gap > 55 ? "high" : gap > 35 ? "medium" : "low",
        title: `${project.code}: ${formatPercent(reportedPct)} spent, ${project.verifiedProgressPercent}% built`,
        detail: `A ${formatPercent(gap)} gap separates reported financial disbursement from verified physical completion.`,
        triggerRule: "Rule F-02 · Spend % exceeds physical % by > 20 pts",
        suggestedAction: "Conduct independent site quantity survey before next payment tranche.",
        projectId: project.id,
        sectorId: project.sectorId,
        issueIds: [],
      });
    }

    if (overdue > 30) {
      push(project.id, {
        kind: "schedule",
        severity: overdue > 180 ? "high" : overdue > 90 ? "medium" : "low",
        title: `${project.code}: ${overdue} days past contracted completion`,
        detail: `Planned completion (${formatDate(project.plannedCompletionDate)}) passed with no recorded handover.`,
        triggerRule: "Rule S-01 · Contracted schedule overrun > 30 days",
        suggestedAction: "Review contractor mobilization log and publish revised handover schedule.",
        projectId: project.id,
        sectorId: project.sectorId,
        issueIds: [],
      });
    }

    if (milestones.missed >= 2) {
      push(project.id, {
        kind: "milestone",
        severity: milestones.adherencePercent < 60 ? "medium" : "low",
        title: `${project.code}: ${milestones.missed} of ${milestones.total} milestones missed`,
        detail: `Milestone adherence stands at ${formatPercent(milestones.adherencePercent, 0)}, with ${milestones.pending} still pending.`,
        triggerRule: "Rule S-02 · Multiple missed delivery milestones",
        suggestedAction: "Audit critical-path bottlenecks at upcoming progress review.",
        projectId: project.id,
        sectorId: project.sectorId,
        issueIds: [],
      });
    }

    if (project.evidenceIds.length === 0) {
      push(project.id, {
        kind: "evidence",
        severity: "informational",
        title: `${project.code}: no evidence attached`,
        detail: "No site photos, invoices, or measurement documents are indexed for this work.",
        triggerRule: "Rule E-01 · Zero archive items linked to project",
        suggestedAction: "Upload baseline work order and pre-construction site photos.",
        projectId: project.id,
        sectorId: project.sectorId,
        issueIds: [],
      });
    }

    // Multiple unresolved civic issues linked to same sanctioned project
    const openLinked = issues.filter(
      (issue) => issue.projectId === project.id && issue.status !== "resolved"
    );
    if (openLinked.length >= 2) {
      push(project.id, {
        kind: "project_issue_cluster",
        severity: openLinked.some((i) => i.severity === "critical") ? "high" : "medium",
        title: `${project.code}: ${openLinked.length} unresolved civic issues linked to corridor`,
        detail: `${openLinked.map((i) => i.code).join(", ")} remain open on this sanctioned corridor.`,
        triggerRule: "Rule G-09 · ≥ 2 unresolved civic issues on one sanctioned work",
        suggestedAction: "Coordinate corridor-wide engineering remediation rather than isolated patches.",
        projectId: project.id,
        sectorId: project.sectorId,
        issueIds: openLinked.map((i) => i.id),
      });
    }
  }

  /* --------------------- Issue & Governance V2 Rules ------------------- */
  for (const issue of issues) {
    const sla = deriveIssueSla(issue);
    const dept = getDepartmentForIssue(issue);

    // 1. Overdue municipal repairs
    if (sla.state === "overdue") {
      push(issue.id, {
        kind: "overdue_repair",
        severity:
          (sla.daysOverdue ?? 0) >= 10 || issue.severity === "critical"
            ? "critical"
            : "high",
        title: `${issue.code}: Municipal repair ${sla.daysOverdue}d overdue`,
        detail: `${dept.shortName} missed estimated repair target ${
          issue.estimatedRepairDate ? formatDate(issue.estimatedRepairDate) : ""
        } for "${issue.title}".`,
        triggerRule: "Rule G-01 · Estimated repair date elapsed without completion submission",
        suggestedAction: "Escalate to department lead for updated crew schedule or completion proof.",
        projectId: issue.projectId,
        sectorId: issue.sectorId,
        issueIds: [issue.id],
      });
    }

    // 2. Missing official response beyond SLA target (7 days)
    if (
      sla.state === "awaiting_official_response" &&
      (sla.responseDelayDays ?? 0) > 7
    ) {
      push(issue.id, {
        kind: "missing_response",
        severity: issue.severity === "critical" ? "high" : "medium",
        title: `${issue.code}: No official department response (${sla.responseDelayDays}d elapsed)`,
        detail: `Issue reported ${formatDate(issue.reportedAt)} (${dept.shortName}) still lacks an official response and estimated repair date.`,
        triggerRule: "Rule G-02 · Official response target (> 7 days) exceeded",
        suggestedAction: "Assign responsible team and publish an estimated repair date.",
        projectId: issue.projectId,
        sectorId: issue.sectorId,
        issueIds: [issue.id],
      });
    }

    // 3. Delayed independent verification (> 3 days in awaiting_verification)
    if (sla.state === "verification_pending") {
      push(issue.id, {
        kind: "delayed_verification",
        severity: "medium",
        title: `${issue.code}: Verification delayed ${sla.verificationWaitDays}d`,
        detail: `Official repair completion was submitted for "${issue.title}" and has awaited independent Civic Verifier inspection beyond 72 hours.`,
        triggerRule: "Rule G-07 · Verification queue SLA (> 3 days) exceeded",
        suggestedAction: "Assign an independent Civic Verifier to inspect and certify or reject.",
        projectId: issue.projectId,
        sectorId: issue.sectorId,
        issueIds: [issue.id],
      });
    }

    // 4. Failed independent repair verification
    const rejectedAttempts =
      issue.repairAttempts?.filter((a) => a.verification?.decision === "rejected") ?? [];
    if (rejectedAttempts.length > 0) {
      const latestRejected = rejectedAttempts[rejectedAttempts.length - 1];
      push(issue.id, {
        kind: "failed_verification",
        severity: issue.severity === "critical" ? "critical" : "high",
        title: `${issue.code}: Failed independent repair verification (Attempt #${latestRejected.attemptNumber})`,
        detail:
          latestRejected.verification?.notes ??
          "Independent inspection rejected submitted municipal repair.",
        triggerRule: "Rule G-03 · Independent repair verification rejected",
        suggestedAction: "Require root-cause remediation plan before re-submitting for verification.",
        detectedAt: latestRejected.verification?.verifiedAt ?? issue.updatedAt,
        projectId: issue.projectId,
        sectorId: issue.sectorId,
        issueIds: [issue.id],
      });
    }

    // 5. Frequent deadline extensions (>= 2)
    if ((issue.deadlineHistory?.length ?? 0) >= 2) {
      push(issue.id, {
        kind: "frequent_extensions",
        severity: sla.hasHistoricalBreach ? "high" : "medium",
        title: `${issue.code}: ${issue.deadlineHistory?.length} repair deadline revisions logged`,
        detail: `Target completion for "${issue.title}" was revised multiple times while remaining unresolved.`,
        triggerRule: "Rule G-06 · ≥ 2 repair deadline revisions on active issue",
        suggestedAction: "Review contractor capacity and underlying utility/material blockers.",
        projectId: issue.projectId,
        sectorId: issue.sectorId,
        issueIds: [issue.id],
      });
    }

    // 6. Resolved or submitted repair without verified supporting evidence
    if (
      (issue.status === "awaiting_verification" ||
        (issue.status === "resolved" && issue.resolutionVerification === "verified")) &&
      !issue.evidenceIds.some((eid) => {
        const ev = evidenceById.get(eid);
        return ev && (ev.verified || ev.category === "official_repair");
      })
    ) {
      push(issue.id, {
        kind: "insufficient_evidence",
        severity: "medium",
        title: `${issue.code}: Repair completion lacks verified supporting evidence`,
        detail: `"${issue.title}" entered completion stage without sufficient repair documentation.`,
        triggerRule: "Rule G-05 · Repair completion missing documented evidence",
        suggestedAction: "Attach dated field photos or test logs for verification.",
        projectId: issue.projectId,
        sectorId: issue.sectorId,
        issueIds: [issue.id],
      });
    }
  }

  /* ---------------------- Flagged Evidence Rule ------------------------ */
  for (const ev of evidenceList) {
    if (ev.status === "flagged") {
      push(ev.id, {
        kind: "flagged_evidence",
        severity: "high",
        title: `Flagged evidence ${ev.id}: ${ev.title}`,
        detail:
          ev.verificationReason ??
          "An independent Civic Verifier flagged discrepancies in this record.",
        triggerRule: "Rule G-08 · Evidence flagged during verification audit",
        suggestedAction: "Review underlying measurements and inspect the site independently.",
        detectedAt: ev.verifiedAt ?? ev.capturedAt,
        projectId: ev.projectId,
        issueIds: ev.issueId ? [ev.issueId] : [],
      });
    }
  }

  /* ----------------------- Recurrence & Reopens ------------------------ */
  for (const group of clusterByLocation(issues).values()) {
    if (group.length < 2) continue;
    const open = group.filter((issue) => issue.status !== "resolved");
    if (open.length === 0) continue;

    const reports = group.reduce((sum, issue) => sum + issue.reportCount, 0);
    const latest = group[group.length - 1];
    const reopenedCount = group.filter((issue) => issue.status === "reopened").length;

    if (reopenedCount >= 2 || group.length >= 3) {
      push(latest.locationKey, {
        kind: "repeated_reopen",
        severity: "critical",
        title: `Repeated failure site: ${group.length} reports at ${latest.location}`,
        detail: `${reports} cumulative citizen confirmations across ${group.length} linked files since ${formatDate(
          group[0].reportedAt
        )}, indicating recurring post-repair failure.`,
        triggerRule: "Rule G-04 · ≥ 3 linked issues or multiple reopens at identical site",
        suggestedAction: "Mandate independent geotechnical/structural audit before further patching.",
        projectId: latest.projectId,
        sectorId: latest.sectorId,
        issueIds: group.map((issue) => issue.id),
      });
    } else {
      push(latest.locationKey, {
        kind: "recurrence",
        severity: open.some((i) => i.severity === "critical") ? "high" : "medium",
        title: `${group.length} reports at ${latest.location}`,
        detail: `${reports} citizen submissions have been filed at this site since ${formatDate(
          group[0].reportedAt
        )}, and ${open.length} remain open.`,
        triggerRule: "Rule G-10 · Multiple reports clustered on physical locationKey",
        suggestedAction: "Inspect whether earlier repair resolved root cause.",
        projectId: latest.projectId,
        sectorId: latest.sectorId,
        issueIds: group.map((issue) => issue.id),
      });
    }
  }

  return findings.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.confidence - a.confidence ||
      a.title.localeCompare(b.title)
  );
}

export function summariseAnomalies(findings: AnomalyFinding[]): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  projects: number;
} {
  return {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    informational: findings.filter((f) => f.severity === "informational").length,
    projects: new Set(findings.map((f) => f.projectId).filter(Boolean)).size,
  };
}
