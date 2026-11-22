import { ISSUES, PROJECTS } from "@/data";
import type { Issue } from "@/types/citytrace";
import {
  clusterByLocation,
  getMilestoneTotals,
  getProjectOverdueDays,
} from "./stats";
import { formatBdtCompact, formatDate, formatPercent } from "@/utils/formatters";

/**
 * City-wide anomaly sweep.
 *
 * Each rule below encodes one kind of observable inconsistency in the record.
 * A finding is an observation that needs verification — never an accusation,
 * and never a conclusion the data cannot support.
 */

export type AnomalyKind =
  | "spend"
  | "progress"
  | "schedule"
  | "milestone"
  | "evidence"
  | "recurrence";

export type AnomalySeverity = "high" | "medium" | "low";

export interface AnomalyFinding {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  detail: string;
  /** Underlying records, so the UI can link straight to them. */
  projectId?: string;
  issueIds: string[];
  confidence: number;
}

const KIND_LABEL: Record<AnomalyKind, string> = {
  spend: "Spending",
  progress: "Progress vs money",
  schedule: "Schedule",
  milestone: "Milestones",
  evidence: "Evidence gap",
  recurrence: "Recurring failure",
};

export function anomalyKindLabel(kind: AnomalyKind): string {
  return KIND_LABEL[kind];
}

const BASE_CONFIDENCE: Record<AnomalyKind, number> = {
  spend: 90,
  progress: 88,
  schedule: 94,
  milestone: 76,
  evidence: 80,
  recurrence: 86,
};

const SEVERITY_RANK: Record<AnomalySeverity, number> = { high: 0, medium: 1, low: 2 };

export function findAnomalies(issues: Issue[] = ISSUES): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];

  const push = (
    finding: Omit<AnomalyFinding, "id" | "confidence"> & { confidence?: number }
  ) => {
    findings.push({
      ...finding,
      id: `${finding.kind}:${finding.projectId ?? finding.issueIds[0] ?? findings.length}`,
      confidence: finding.confidence ?? BASE_CONFIDENCE[finding.kind],
    });
  };

  /* ------------------------------ Projects ----------------------------- */
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

    // 1. Reported money with no verified evidence behind it.
    if (unverifiedPct > 10) {
      push({
        kind: "spend",
        severity: unverifiedPct > 60 ? "high" : unverifiedPct > 25 ? "medium" : "low",
        title: `${project.code}: ${formatPercent(unverifiedPct)} of allocation is unverified`,
        detail:
          verified === undefined
            ? `${formatBdtCompact(reported)} is reported as spent with no independently verified financial record on file.`
            : `${formatBdtCompact(unverified)} of the ${formatBdtCompact(reported)} reported as spent is not supported by verified evidence.`,
        projectId: project.id,
        issueIds: [],
      });
    }

    // 2. Money drawn far ahead of physical progress.
    if (gap > 20) {
      push({
        kind: "progress",
        severity: gap > 55 ? "high" : gap > 35 ? "medium" : "low",
        title: `${project.code}: ${formatPercent(reportedPct)} spent, ${project.verifiedProgressPercent}% built`,
        detail: `A ${formatPercent(gap)} gap between the financial position and verified physical progress on site.`,
        projectId: project.id,
        issueIds: [],
      });
    }

    // 3. Schedule overrun.
    if (overdue > 30) {
      push({
        kind: "schedule",
        severity: overdue > 180 ? "high" : overdue > 90 ? "medium" : "low",
        title: `${project.code}: ${overdue} days past the contracted date`,
        detail: `The planned completion date of ${formatDate(project.plannedCompletionDate)} has passed with no recorded handover.`,
        projectId: project.id,
        issueIds: [],
      });
    }

    // 4. Milestones slipping as a pattern.
    if (milestones.missed >= 2) {
      push({
        kind: "milestone",
        severity: milestones.adherencePercent < 60 ? "medium" : "low",
        title: `${project.code}: ${milestones.missed} of ${milestones.total} milestones missed`,
        detail: `Milestone adherence stands at ${formatPercent(milestones.adherencePercent, 0)}, with ${milestones.pending} milestones still pending.`,
        projectId: project.id,
        issueIds: [],
      });
    }

    // 5. No evidence at all.
    if (project.evidenceIds.length === 0) {
      push({
        kind: "evidence",
        severity: "low",
        title: `${project.code}: no evidence attached`,
        detail:
          "Neither progress nor payment on this work can be substantiated from the archive.",
        projectId: project.id,
        issueIds: [],
      });
    }
  }

  /* --------------------------- Recurrence ------------------------------ */
  for (const group of clusterByLocation(issues).values()) {
    if (group.length < 2) continue;
    const open = group.filter((issue) => issue.status !== "resolved");
    if (open.length === 0) continue;

    const reports = group.reduce((sum, issue) => sum + issue.reportCount, 0);
    const latest = group[group.length - 1];
    const criticalOpen = open.filter((issue) => issue.severity === "critical").length;

    // A single critical report is serious; two or more open reports at the same
    // spot is what warrants the highest severity.
    push({
      kind: "recurrence",
      severity: criticalOpen > 0 && open.length > 1 ? "high" : "medium",
      title: `${group.length} reports at ${latest.location}`,
      detail: `${reports} citizen submissions have been filed against this single location since ${formatDate(
        group[0].reportedAt
      )}, and ${open.length} remain open.`,
      projectId: latest.projectId,
      issueIds: group.map((issue) => issue.id),
    });
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
  high: number;
  medium: number;
  low: number;
  projects: number;
} {
  return {
    total: findings.length,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
    projects: new Set(findings.map((finding) => finding.projectId).filter(Boolean)).size,
  };
}
