import {
  getEvidence,
  getIssuesAtLocation,
  getIssuesForProject,
  getProject,
  getSector,
} from "@/data";
import type { InvestigationReport, Project } from "@/types/citytrace";
import {
  DEMO_NOW,
  DEMO_NOW_LABEL,
  getMilestoneTotals,
  getProjectOverdueDays,
} from "./stats";
import { formatBdt, formatDate, formatPercent } from "@/utils/formatters";

/**
 * CITYTRACE rules engine.
 *
 * A deterministic analyst that reads only the stored record: it never invents a
 * date, a figure or an accusation. Every finding below traces back to a field
 * in the dataset, which is what makes the AI layer auditable.
 *
 * It also serves as the offline fallback when no Gemini key is configured.
 */

export interface ProjectAnalysisContext {
  project: Project;
  issuesAtLocation: ReturnType<typeof getIssuesAtLocation>;
  linkedIssues: ReturnType<typeof getIssuesForProject>;
  evidence: ReturnType<typeof getEvidence>;
  sectorName: string;
  overdueDays: number;
  reportedPercent: number;
  verifiedPercent: number | undefined;
  unverifiedAmount: number;
  unverifiedPercent: number;
  financialGap: number;
  milestones: ReturnType<typeof getMilestoneTotals>;
  /**
   * True only when the same location has more than one issue and at least one
   * of them is still open or has been reopened. Two resolved snags are not a
   * recurring failure.
   */
  hasRecurrence: boolean;
}

export function buildContext(projectId: string): ProjectAnalysisContext | null {
  const project = getProject(projectId);
  if (!project) return null;

  const issuesAtLocation = getIssuesAtLocation(project.locationKey);
  const linkedIssues = getIssuesForProject(project.id);
  const evidence = getEvidence(project.evidenceIds);
  const sector = getSector(project.sectorId);

  const reportedPercent =
    project.allocatedBudgetBdt > 0
      ? (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100
      : 0;
  const verifiedPercent =
    project.verifiedExpenditureBdt !== undefined && project.allocatedBudgetBdt > 0
      ? (project.verifiedExpenditureBdt / project.allocatedBudgetBdt) * 100
      : undefined;
  const unverifiedAmount =
    project.verifiedExpenditureBdt === undefined
      ? project.reportedExpenditureBdt
      : Math.max(0, project.reportedExpenditureBdt - project.verifiedExpenditureBdt);
  const unverifiedPercent =
    project.allocatedBudgetBdt > 0
      ? (unverifiedAmount / project.allocatedBudgetBdt) * 100
      : 0;
  const financialGap = reportedPercent - project.verifiedProgressPercent;

  const hasOpenIssue = linkedIssues.some((issue) => issue.status !== "resolved");
  const hasReopenedIssue = issuesAtLocation.some(
    (issue) => issue.status === "reopened"
  );
  const hasRecurrence =
    issuesAtLocation.length > 1 && (hasOpenIssue || hasReopenedIssue);

  return {
    project,
    issuesAtLocation,
    linkedIssues,
    evidence,
    sectorName: sector ? `${sector.name} (${sector.code})` : project.sectorId,
    overdueDays: getProjectOverdueDays(project),
    reportedPercent,
    verifiedPercent,
    unverifiedAmount,
    unverifiedPercent,
    financialGap,
    milestones: getMilestoneTotals(project),
    hasRecurrence,
  };
}

function riskFromScore(score: number): InvestigationReport["riskLevel"] {
  if (score >= 8) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

function computeRiskScore(ctx: ProjectAnalysisContext): number {
  let score = 0;

  if (ctx.overdueDays > 90) score += 3;
  else if (ctx.overdueDays > 0) score += 2;

  if (ctx.financialGap > 40) score += 3;
  else if (ctx.financialGap > 20) score += 2;
  else if (ctx.financialGap > 10) score += 1;

  if (ctx.hasRecurrence) score += 2;

  if (ctx.unverifiedPercent > 20) score += 3;
  else if (ctx.unverifiedPercent > 10) score += 2;
  else if (ctx.unverifiedPercent > 0) score += 1;

  if (ctx.milestones.missed >= 2) score += 1;

  if (
    ctx.project.verifiedProgressPercent < 50 &&
    ctx.reportedPercent > 80
  ) {
    score += 2;
  }

  return score;
}

function computeConfidence(ctx: ProjectAnalysisContext): number {
  const verifiedEvidence = ctx.evidence.filter((item) => item.verified).length;
  let confidence = 70 + Math.min(12, verifiedEvidence * 3);
  if (ctx.project.verifiedExpenditureBdt !== undefined) confidence += 4;
  if (ctx.hasRecurrence) confidence += 3;
  if (ctx.project.verifiedExpenditureBdt === undefined) confidence -= 6;
  return Math.round(Math.min(96, Math.max(50, confidence)));
}

/** Builds a complete, evidence-bound report from the stored record alone. */
export function analyzeProject(projectId: string): InvestigationReport | null {
  const ctx = buildContext(projectId);
  if (!ctx) return null;

  const { project } = ctx;
  const score = computeRiskScore(ctx);
  const riskLevel = riskFromScore(score);
  const totalReports = ctx.linkedIssues.reduce((sum, issue) => sum + issue.reportCount, 0);
  const distinctIssues = ctx.issuesAtLocation.length;
  const openIssues = ctx.linkedIssues.filter((issue) => issue.status !== "resolved");

  /* ------------------------------ Headline ------------------------------ */
  let headline: string;
  if (riskLevel === "HIGH") {
    headline =
      ctx.unverifiedPercent > 20
        ? `${formatPercent(ctx.reportedPercent)} of budget reported spent, ${formatPercent(ctx.unverifiedPercent)} of it without verification`
        : `${formatPercent(ctx.reportedPercent)} of budget spent against ${project.verifiedProgressPercent}% verified physical progress`;
  } else if (riskLevel === "MEDIUM") {
    headline = ctx.overdueDays
      ? `${ctx.overdueDays} days past the contracted date with ${formatPercent(ctx.reportedPercent)} of budget drawn`
      : `Delivery broadly on track, with ${formatBdt(ctx.unverifiedAmount)} of reported spend still unverified`;
  } else {
    headline =
      project.status === "completed"
        ? `Delivered on schedule with fully verified expenditure and no open defects`
        : `Sanctioned work is not yet mobilised and shows no spending anomalies`;
  }

  /* --------------------------- Executive summary ------------------------ */
  const executiveSummary = [
    `${project.name} (${project.code}) is executed by ${project.authority} in ${ctx.sectorName}.`,
    `The sanctioned ceiling is ${formatBdt(project.allocatedBudgetBdt)}; ${formatBdt(
      project.reportedExpenditureBdt
    )} is reported as spent (${formatPercent(ctx.reportedPercent)}).`,
    project.verifiedExpenditureBdt === undefined
      ? "No independently verified financial record exists for this work."
      : `${formatBdt(project.verifiedExpenditureBdt)} of that spend is independently verified, leaving ${formatBdt(
          ctx.unverifiedAmount
        )} unsupported by evidence on file.`,
    `Verified physical progress stands at ${project.verifiedProgressPercent}% against a planned completion date of ${formatDate(
      project.plannedCompletionDate
    )}${ctx.overdueDays > 0 ? ` — ${ctx.overdueDays} days in the past as of ${DEMO_NOW_LABEL}` : ""}.`,
  ].join(" ");

  /* ------------------------- Repair / recurrence ------------------------ */
  const recurrenceAnalysis = ctx.hasRecurrence
    ? [
        `${distinctIssues} separate civic issues are recorded at this location, drawing ${totalReports} citizen reports in total.`,
        `The most recent is ${ctx.issuesAtLocation[ctx.issuesAtLocation.length - 1].code} (${formatDate(
          ctx.issuesAtLocation[ctx.issuesAtLocation.length - 1].reportedAt
        )}), currently ${ctx.issuesAtLocation[ctx.issuesAtLocation.length - 1].status}.`,
        openIssues.length > 0
          ? `${openIssues.length} of those issues remain open while the associated works continue.`
          : "The earlier issues at this location were closed, but a later report reopened the same problem.",
      ].join(" ")
    : distinctIssues > 1
      ? `${distinctIssues} issues have been recorded at this location over time, all of them now closed (${totalReports} citizen reports in total). No repeat failure is currently outstanding.`
      : ctx.linkedIssues.length > 0
        ? `${ctx.linkedIssues.length} civic issue is linked to this work (${ctx.linkedIssues
            .map((issue) => issue.code)
            .join(", ")}), with ${totalReports} citizen reports. No repeat reports exist at this location yet.`
        : "No civic issue has been recorded against this work, so there is no observed recurrence to assess.";

  /* ----------------------------- Delay analysis -------------------------- */
  const delayAnalysis = [
    ctx.overdueDays > 0
      ? `The planned completion date of ${formatDate(project.plannedCompletionDate)} has passed by ${ctx.overdueDays} days as of ${DEMO_NOW_LABEL}.`
      : project.actualCompletionDate
        ? `Work completed on ${formatDate(project.actualCompletionDate)} against a target of ${formatDate(
            project.plannedCompletionDate
          )}.`
        : `The planned completion date of ${formatDate(project.plannedCompletionDate)} has not yet passed.`,
    `${ctx.milestones.met} of ${ctx.milestones.total} milestones were met and ${ctx.milestones.missed} were missed.`,
    ctx.milestones.inProgress > 0
      ? `${ctx.milestones.inProgress} milestone${ctx.milestones.inProgress === 1 ? " is" : "s are"} in progress and ${ctx.milestones.pending} remain pending.`
      : `${ctx.milestones.pending} milestone${ctx.milestones.pending === 1 ? " remains" : "s remain"} pending.`,
  ].join(" ");

  /* ---------------------------- Budget analysis -------------------------- */
  const budgetAnalysis = [
    `Allocation ${formatBdt(project.allocatedBudgetBdt)}; reported expenditure ${formatBdt(
      project.reportedExpenditureBdt
    )} (${formatPercent(ctx.reportedPercent)}).`,
    project.verifiedExpenditureBdt === undefined
      ? "Verified expenditure is missing entirely, so the reported figure cannot be reconciled against evidence."
      : `Verified expenditure ${formatBdt(project.verifiedExpenditureBdt)} (${formatPercent(
          ctx.verifiedPercent ?? 0
        )}), leaving ${formatBdt(ctx.unverifiedAmount)} unverified.`,
    `Verified physical progress of ${project.verifiedProgressPercent}% implies a ${formatPercent(
      ctx.financialGap
    )} gap against the financial position.`,
  ].join(" ");

  /* ---------------------------- Inconsistencies -------------------------- */
  const inconsistencies: string[] = [];
  if (ctx.financialGap > 20) {
    inconsistencies.push(
      `${formatPercent(ctx.reportedPercent)} of the allocation is reported spent while verified physical progress is ${project.verifiedProgressPercent}% — a ${formatPercent(ctx.financialGap)} gap.`
    );
  }
  if (project.verifiedExpenditureBdt === undefined && project.reportedExpenditureBdt > 0) {
    inconsistencies.push(
      `${formatBdt(project.reportedExpenditureBdt)} is reported as spent with no independently verified financial record on file.`
    );
  } else if (ctx.unverifiedPercent > 10) {
    inconsistencies.push(
      `${formatBdt(ctx.unverifiedAmount)} (${formatPercent(ctx.unverifiedPercent)} of allocation) is reported spent but not supported by verified evidence.`
    );
  }
  if (ctx.hasRecurrence) {
    inconsistencies.push(
      `${distinctIssues} separate issues and ${totalReports} citizen reports exist at this single location, indicating a repeated failure rather than a one-off defect.`
    );
  }
  if (ctx.overdueDays > 0) {
    inconsistencies.push(
      `The contractual date of ${formatDate(project.plannedCompletionDate)} passed ${ctx.overdueDays} days ago with no recorded completion.`
    );
  }
  if (ctx.milestones.missed >= 2) {
    inconsistencies.push(
      `${ctx.milestones.missed} of ${ctx.milestones.total} milestones were missed, leaving ${ctx.milestones.adherencePercent.toFixed(0)}% milestone adherence.`
    );
  }
  if (ctx.evidence.length === 0) {
    inconsistencies.push(
      "No evidence items of any kind are attached to this work, so neither progress nor payment can be substantiated from the archive."
    );
  }
  if (inconsistencies.length === 0) {
    inconsistencies.push(
      "No material budget, milestone or timeline inconsistencies were detected in this record."
    );
  }

  /* ------------------------- Evidence citations -------------------------- */
  const citations = ctx.evidence.slice(0, 4).map((item) => ({
    label: `${item.kind === "photo" ? "Photograph" : item.kind === "document" ? "Document" : item.kind === "measurement" ? "Measurement" : item.kind === "satellite" ? "Satellite record" : "Sensor log"} · ${formatDate(item.capturedAt)}`,
    fact: `${item.title} — ${item.description}`,
    significance: item.verified
      ? `Independently verified by ${item.source}, so it can be relied on in this assessment.`
      : `Supplied by ${item.source} but not independently verified, so it is treated as an unconfirmed claim.`,
    recordRefs: [project.id, item.id],
  }));

  const milestoneCitations = project.milestones
    .filter((milestone) => milestone.status === "missed")
    .slice(0, 2)
    .map((milestone) => ({
      label: `Missed milestone · ${milestone.title}`,
      fact: `Planned for ${formatDate(milestone.plannedDate)}${
        milestone.actualDate ? `, recorded ${formatDate(milestone.actualDate)}` : ", never recorded as achieved"
      }.${milestone.note ? ` ${milestone.note}` : ""}`,
      significance:
        "Documents schedule slippage against the programme the authority itself published.",
      recordRefs: [project.id],
    }));

  const issueCitations = ctx.issuesAtLocation.slice(0, 2).map((issue) => ({
    label: `Civic issue · ${issue.code}`,
    fact: `${issue.title} — reported ${formatDate(issue.reportedAt)}, currently ${issue.status}, aggregating ${issue.reportCount} citizen reports.`,
    significance: ctx.hasRecurrence
      ? "One of several reports at the same physical location, which is the pattern that indicates a recurring failure."
      : "Establishes that citizens have logged this location in the civic register.",
    recordRefs: [issue.id],
  }));

  const evidenceCitations = [...citations, ...milestoneCitations, ...issueCitations];

  /* ---------------------------- Verify steps ----------------------------- */
  const recommendedVerifySteps: string[] = [];
  if (ctx.unverifiedAmount > 0) {
    recommendedVerifySteps.push(
      `Obtain measurement books and payment vouchers for the ${formatBdt(ctx.unverifiedAmount)} of reported spend that currently has no verified evidence.`
    );
  }
  if (ctx.financialGap > 20) {
    recommendedVerifySteps.push(
      `Reconcile the financial progress statement (${formatPercent(ctx.reportedPercent)}) against an independent physical measurement of the site (${project.verifiedProgressPercent}%).`
    );
  }
  if (ctx.hasRecurrence) {
    recommendedVerifySteps.push(
      `Review the earlier works at this location to establish whether the previous intervention addressed the root cause or only the visible symptom.`
    );
  }
  if (ctx.overdueDays > 0) {
    recommendedVerifySteps.push(
      `Check whether a time extension was formally granted for the ${ctx.overdueDays}-day overrun, and on what contractual basis.`
    );
  }
  if (ctx.evidence.length === 0) {
    recommendedVerifySteps.push(
      "Request the site inspection file before any further payment is authorised, as no evidence is currently attached to this work."
    );
  }
  if (recommendedVerifySteps.length === 0) {
    recommendedVerifySteps.push(
      "Maintain the current evidence cadence and re-verify expenditure at the next scheduled milestone."
    );
  }

  /* ------------------------- Missing information ------------------------- */
  const missingInformation: string[] = [];
  if (project.verifiedExpenditureBdt === undefined) {
    missingInformation.push("Independent financial verification of reported expenditure.");
  }
  if (ctx.evidence.length === 0) {
    missingInformation.push("Any site evidence — photographs, measurements or inspection reports.");
  }
  if (project.status !== "completed" && ctx.overdueDays > 0) {
    missingInformation.push(
      "A time-extension decision or revised completion date for the current overrun."
    );
  }
  if (project.milestones.some((milestone) => milestone.status === "missed" && !milestone.note)) {
    missingInformation.push("Explanations for milestones recorded as missed without a stated reason.");
  }
  if (missingInformation.length === 0) {
    missingInformation.push(
      "Nothing material is missing from this record; the evidence base is complete for the snapshot."
    );
  }

  return {
    caseId: project.id,
    source: "demo-fallback",
    model: "CITYTRACE Rules Engine v1",
    generatedAt: new Date().toISOString(),
    headline,
    riskLevel,
    confidenceScore: computeConfidence(ctx),
    executiveSummary,
    repairHistoryAnalysis: recurrenceAnalysis,
    delayAnalysis,
    budgetAnalysis,
    inconsistencies,
    evidenceCitations,
    recommendedVerifySteps,
    missingInformation,
  };
}

/** Compact prompt context for Gemini — only fields the analyst may cite. */
export function buildPromptContext(projectId: string) {
  const ctx = buildContext(projectId);
  if (!ctx) return null;

  return {
    snapshotDate: DEMO_NOW,
    sector: { id: ctx.project.sectorId, name: ctx.sectorName },
    project: {
      id: ctx.project.id,
      code: ctx.project.code,
      name: ctx.project.name,
      authority: ctx.project.authority,
      status: ctx.project.status,
      location: ctx.project.location,
      startDate: ctx.project.startDate,
      plannedCompletionDate: ctx.project.plannedCompletionDate,
      actualCompletionDate: ctx.project.actualCompletionDate ?? null,
      allocatedBudgetBdt: ctx.project.allocatedBudgetBdt,
      reportedExpenditureBdt: ctx.project.reportedExpenditureBdt,
      verifiedExpenditureBdt: ctx.project.verifiedExpenditureBdt ?? null,
      verifiedProgressPercent: ctx.project.verifiedProgressPercent,
      overdueDays: ctx.overdueDays,
      milestones: ctx.project.milestones,
    },
    issuesAtLocation: ctx.issuesAtLocation.map((issue) => ({
      id: issue.id,
      code: issue.code,
      title: issue.title,
      status: issue.status,
      reportedAt: issue.reportedAt,
      reportCount: issue.reportCount,
      category: issue.category,
    })),
    evidence: ctx.evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      capturedAt: item.capturedAt,
      source: item.source,
      verified: item.verified,
      description: item.description,
    })),
  };
}
