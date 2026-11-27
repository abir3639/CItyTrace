import {
  EVIDENCE,
  ISSUES,
  PROJECTS,
  SECTORS,
  isIssueOpen,
} from "@/data";
import type {
  CivicHealthSummary,
  Evidence,
  Issue,
  IssueCategory,
  IssueStatus,
  Project,
  Sector,
  UserRole,
} from "@/types/citytrace";
import { ISSUE_CATEGORIES } from "@/types/citytrace";
import { DEPARTMENTS, getDepartmentForIssue } from "./departments";
import { daysBetween } from "@/utils/formatters";

/**
 * Every statistic in CITYTRACE is computed from a supplied issue list rather
 * than from the seed module directly, so citizen reports flow into the
 * dashboard the moment they are filed. Callers that have no override simply
 * omit the argument and get the seeded dataset.
 *
 * The dataset is a frozen snapshot, so "today" is part of the data rather than
 * the wall clock — two screens can never disagree about how overdue a work is.
 */
export const DEMO_NOW = "2025-07-22";
export const DEMO_NOW_LABEL = "22 Jul 2025";

/* ------------------------------------------------------------------ */
/* Clustering                                                          */
/* ------------------------------------------------------------------ */

/** Groups issues by physical location, each group oldest first. */
export function clusterByLocation(issues: Issue[]): Map<string, Issue[]> {
  const clusters = new Map<string, Issue[]>();
  for (const issue of issues) {
    const existing = clusters.get(issue.locationKey);
    if (existing) existing.push(issue);
    else clusters.set(issue.locationKey, [issue]);
  }
  for (const [, group] of clusters) {
    group.sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
  }
  return clusters;
}

/* ------------------------------------------------------------------ */
/* Civic health                                                        */
/* ------------------------------------------------------------------ */

export function getCivicHealth(issues: Issue[] = ISSUES): CivicHealthSummary {
  const openIssues = issues.filter(isIssueOpen);
  const resolvedIssues = issues.filter((issue) => issue.status === "resolved");
  const recurringClusters = [...clusterByLocation(issues).values()].filter(
    (group) => group.length > 1
  );
  const budgets = getBudgetTotals();

  return {
    totalIssues: issues.length,
    openIssues: openIssues.length,
    resolvedIssues: resolvedIssues.length,
    reopenedIssues: issues.filter((issue) => issue.status === "reopened").length,
    recurringClusters: recurringClusters.length,
    totalProjects: PROJECTS.length,
    activeProjects: PROJECTS.filter((p) => p.status === "active").length,
    delayedProjects: PROJECTS.filter(
      (p) => p.status === "delayed" || p.status === "stalled"
    ).length,
    completedProjects: PROJECTS.filter((p) => p.status === "completed").length,
    allocatedBudgetBdt: budgets.allocatedBdt,
    reportedExpenditureBdt: budgets.reportedBdt,
    verifiedExpenditureBdt: budgets.verifiedBdt,
    projectsWithVerifiedSpend: budgets.projectsWithVerifiedSpend,
  };
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export interface BudgetTotals {
  allocatedBdt: number;
  reportedBdt: number;
  verifiedBdt: number;
  /**
   * Reported spend that no independent evidence supports. This is the number
   * the demo is really about — never silently treat it as confirmed.
   */
  unverifiedBdt: number;
  projectsTotal: number;
  projectsWithVerifiedSpend: number;
  reportedUtilisationPercent: number;
  verifiedUtilisationPercent: number;
}

export function getBudgetTotals(projects: Project[] = PROJECTS): BudgetTotals {
  const allocatedBdt = projects.reduce((sum, p) => sum + p.allocatedBudgetBdt, 0);
  const reportedBdt = projects.reduce(
    (sum, p) => sum + p.reportedExpenditureBdt,
    0
  );
  const verifiedBdt = projects.reduce(
    (sum, p) => sum + (p.verifiedExpenditureBdt ?? 0),
    0
  );
  const projectsWithVerifiedSpend = projects.filter(
    (p) => p.verifiedExpenditureBdt !== undefined
  ).length;

  return {
    allocatedBdt,
    reportedBdt,
    verifiedBdt,
    unverifiedBdt: Math.max(0, reportedBdt - verifiedBdt),
    projectsTotal: projects.length,
    projectsWithVerifiedSpend,
    reportedUtilisationPercent:
      allocatedBdt > 0 ? (reportedBdt / allocatedBdt) * 100 : 0,
    verifiedUtilisationPercent:
      allocatedBdt > 0 ? (verifiedBdt / allocatedBdt) * 100 : 0,
  };
}

export function getBudgetFor(project: Project): {
  allocated: number;
  reported: number;
  verified?: number;
  reportedPercent: number;
  verifiedPercent?: number;
} {
  return {
    allocated: project.allocatedBudgetBdt,
    reported: project.reportedExpenditureBdt,
    verified: project.verifiedExpenditureBdt,
    reportedPercent:
      project.allocatedBudgetBdt > 0
        ? (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100
        : 0,
    verifiedPercent:
      project.verifiedExpenditureBdt !== undefined &&
      project.allocatedBudgetBdt > 0
        ? (project.verifiedExpenditureBdt / project.allocatedBudgetBdt) * 100
        : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

export function getProjectOverdueDays(
  project: Project,
  now: string = DEMO_NOW
): number {
  if (project.status === "completed") return 0;
  return Math.max(0, daysBetween(project.plannedCompletionDate, now));
}

export function isProjectOverdue(project: Project, now: string = DEMO_NOW) {
  return getProjectOverdueDays(project, now) > 0;
}

export interface MilestoneTotals {
  total: number;
  met: number;
  missed: number;
  inProgress: number;
  pending: number;
  /** Share of due milestones that were actually met. */
  adherencePercent: number;
}

export function getMilestoneTotals(project: Project): MilestoneTotals {
  const total = project.milestones.length;
  const met = project.milestones.filter((m) => m.status === "met").length;
  const missed = project.milestones.filter((m) => m.status === "missed").length;
  const inProgress = project.milestones.filter(
    (m) => m.status === "in-progress"
  ).length;
  const pending = project.milestones.filter((m) => m.status === "pending").length;
  const decided = met + missed;

  return {
    total,
    met,
    missed,
    inProgress,
    pending,
    adherencePercent: decided > 0 ? (met / decided) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Sectors                                                             */
/* ------------------------------------------------------------------ */

export interface SectorStats {
  sector: Sector;
  issueCount: number;
  openIssues: number;
  resolvedIssues: number;
  recurringClusters: number;
  projectCount: number;
  delayedProjects: number;
  allocatedBdt: number;
  reportedBdt: number;
  verifiedBdt: number;
  /** Open issues per 100k residents — lets small and large sectors compare. */
  openIssuesPer100k: number;
}

export function getSectorStats(issues: Issue[] = ISSUES): SectorStats[] {
  const clusters = clusterByLocation(issues);

  return SECTORS.map((sector) => {
    const sectorIssues = issues.filter((issue) => issue.sectorId === sector.id);
    const projects = PROJECTS.filter((project) => project.sectorId === sector.id);
    const openIssues = sectorIssues.filter(isIssueOpen).length;
    const recurringClusters = [...clusters.values()].filter(
      (group) =>
        group.length > 1 && group.some((issue) => issue.sectorId === sector.id)
    ).length;

    return {
      sector,
      issueCount: sectorIssues.length,
      openIssues,
      resolvedIssues: sectorIssues.length - openIssues,
      recurringClusters,
      projectCount: projects.length,
      delayedProjects: projects.filter(
        (p) => p.status === "delayed" || p.status === "stalled"
      ).length,
      allocatedBdt: projects.reduce((sum, p) => sum + p.allocatedBudgetBdt, 0),
      reportedBdt: projects.reduce(
        (sum, p) => sum + p.reportedExpenditureBdt,
        0
      ),
      verifiedBdt: projects.reduce(
        (sum, p) => sum + (p.verifiedExpenditureBdt ?? 0),
        0
      ),
      openIssuesPer100k:
        sector.populationEstimate > 0
          ? (openIssues / sector.populationEstimate) * 100_000
          : 0,
    };
  }).sort((a, b) => b.openIssues - a.openIssues);
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface CategoryStats {
  category: IssueCategory;
  issueCount: number;
  openIssues: number;
  projectCount: number;
  delayedProjects: number;
  allocatedBdt: number;
  reportedBdt: number;
}

export function getCategoryStats(issues: Issue[] = ISSUES): CategoryStats[] {
  return ISSUE_CATEGORIES.map((category) => {
    const categoryIssues = issues.filter((issue) => issue.category === category);
    const projects = PROJECTS.filter((project) => project.category === category);
    return {
      category,
      issueCount: categoryIssues.length,
      openIssues: categoryIssues.filter(isIssueOpen).length,
      projectCount: projects.length,
      delayedProjects: projects.filter(
        (p) => p.status === "delayed" || p.status === "stalled"
      ).length,
      allocatedBdt: projects.reduce((sum, p) => sum + p.allocatedBudgetBdt, 0),
      reportedBdt: projects.reduce(
        (sum, p) => sum + p.reportedExpenditureBdt,
        0
      ),
    };
  }).sort((a, b) => b.openIssues - a.openIssues || b.issueCount - a.issueCount);
}

/* ------------------------------------------------------------------ */
/* Evidence coverage                                                   */
/* ------------------------------------------------------------------ */

export interface EvidenceCoverage {
  evidenceTotal: number;
  evidenceVerified: number;
  verifiedPercent: number;
  projectsTotal: number;
  projectsWithEvidence: number;
  projectsWithoutEvidence: number;
  projectsMissingVerifiedSpend: Project[];
  issuesTotal: number;
  issuesWithEvidence: number;
  issuesWithoutEvidence: number;
  /** Records of any kind that carry no supporting evidence at all. */
  recordsWithoutEvidence: number;
}

export function getEvidenceCoverage(
  issues: Issue[] = ISSUES,
  evidenceItems: Evidence[] = EVIDENCE
): EvidenceCoverage {
  const projectsWithEvidence = PROJECTS.filter((p) => p.evidenceIds.length > 0);
  const issuesWithEvidence = issues.filter((i) => i.evidenceIds.length > 0);
  const evidenceVerified = evidenceItems.filter((item) => item.verified).length;

  return {
    evidenceTotal: evidenceItems.length,
    evidenceVerified,
    verifiedPercent: evidenceItems.length > 0 ? (evidenceVerified / evidenceItems.length) * 100 : 0,
    projectsTotal: PROJECTS.length,
    projectsWithEvidence: projectsWithEvidence.length,
    projectsWithoutEvidence: PROJECTS.length - projectsWithEvidence.length,
    projectsMissingVerifiedSpend: PROJECTS.filter(
      (p) => p.verifiedExpenditureBdt === undefined
    ),
    issuesTotal: issues.length,
    issuesWithEvidence: issuesWithEvidence.length,
    issuesWithoutEvidence: issues.length - issuesWithEvidence.length,
    recordsWithoutEvidence:
      PROJECTS.length -
      projectsWithEvidence.length +
      (issues.length - issuesWithEvidence.length),
  };
}

/* ------------------------------------------------------------------ */
/* Sorting helpers                                                     */
/* ------------------------------------------------------------------ */

export function sortIssuesNewestFirst(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getRecentIssues(limit = 6, issues: Issue[] = ISSUES): Issue[] {
  return sortIssuesNewestFirst(issues).slice(0, limit);
}

export function getBlockedProjects(now: string = DEMO_NOW): Project[] {
  return PROJECTS.filter(
    (p) => p.status === "delayed" || p.status === "stalled"
  ).sort((a, b) => getProjectOverdueDays(b, now) - getProjectOverdueDays(a, now));
}

/** Every location with more than one recorded issue, worst first. */
export function getRecurringProblems(issues: Issue[] = ISSUES) {
  return [...clusterByLocation(issues).entries()]
    .filter(([, group]) => group.length > 1)
    .map(([locationKey, group]) => ({
      locationKey,
      issues: group,
      latest: group[group.length - 1],
      reportCount: group.reduce((sum, issue) => sum + issue.reportCount, 0),
      openIssues: group.filter(isIssueOpen).length,
      projectId: group.find((issue) => issue.projectId)?.projectId,
    }))
    .sort((a, b) => b.openIssues - a.openIssues || b.reportCount - a.reportCount);
}

/* ------------------------------------------------------------------ */
/* Activity feed                                                       */
/* ------------------------------------------------------------------ */

export interface ActivityEvent {
  id: string;
  issueId: string;
  issueCode: string;
  issueTitle: string;
  sectorId: string;
  at: string;
  status: IssueStatus;
  note: string;
  actor: string;
  actorName?: string;
  actorRole?: UserRole;
}

/** Full history across every issue, newest first. */
export function getActivityFeed(issues: Issue[] = ISSUES): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const issue of issues) {
    for (const entry of issue.history) {
      events.push({
        id: entry.id,
        issueId: issue.id,
        issueCode: issue.code,
        issueTitle: issue.title,
        sectorId: issue.sectorId,
        at: entry.at,
        status: entry.status,
        note: entry.note,
        actor: entry.actor,
        ...(entry.actorName ? { actorName: entry.actorName } : {}),
        ...(entry.actorRole ? { actorRole: entry.actorRole } : {}),
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Activity inside the last `daysBack` days of the snapshot, newest first.
 * Used by the notification indicator and the overview activity panel.
 */
export function getActivitySince(
  daysBack: number,
  limit = 8,
  issues: Issue[] = ISSUES
): ActivityEvent[] {
  const cutoff = new Date(`${DEMO_NOW}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - daysBack);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return getActivityFeed(issues)
    .filter((event) => event.at >= cutoffIso)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Executing agency scorecards                                         */
/* ------------------------------------------------------------------ */

export type AuthorityGrade = "A" | "B" | "C" | "D";

export interface AuthorityScorecard {
  authority: string;
  projectCount: number;
  completedCount: number;
  delayedOrStalledCount: number;
  onTimeRatePercent: number;
  avgOverdueDays: number;
  allocatedBdt: number;
  reportedBdt: number;
  verifiedBdt: number;
  verifiedSpendSharePercent: number;
  linkedIssuesCount: number;
  recurringLocationsCount: number;
  grade: AuthorityGrade;
}

export function getAuthorityScorecards(
  issues: Issue[] = ISSUES,
  now: string = DEMO_NOW
): AuthorityScorecard[] {
  const byAuthority = new Map<string, Project[]>();
  for (const project of PROJECTS) {
    const group = byAuthority.get(project.authority);
    if (group) group.push(project);
    else byAuthority.set(project.authority, [project]);
  }

  const clusters = clusterByLocation(issues);

  return [...byAuthority.entries()]
    .map(([authority, projects]) => {
      const projectCount = projects.length;
      const projectIds = new Set(projects.map((p) => p.id));
      const completedCount = projects.filter((p) => p.status === "completed").length;
      const delayedOrStalledCount = projects.filter(
        (p) => p.status === "delayed" || p.status === "stalled"
      ).length;
      const onTimeRatePercent =
        projectCount > 0 ? ((projectCount - delayedOrStalledCount) / projectCount) * 100 : 100;
      const avgOverdueDays =
        projectCount > 0
          ? Math.round(
              projects.reduce((sum, p) => sum + getProjectOverdueDays(p, now), 0) / projectCount
            )
          : 0;

      const allocatedBdt = projects.reduce((sum, p) => sum + p.allocatedBudgetBdt, 0);
      const reportedBdt = projects.reduce((sum, p) => sum + p.reportedExpenditureBdt, 0);
      const verifiedBdt = projects.reduce(
        (sum, p) => sum + (p.verifiedExpenditureBdt ?? 0),
        0
      );
      const verifiedSpendSharePercent =
        reportedBdt > 0 ? (verifiedBdt / reportedBdt) * 100 : 100;

      const linkedIssues = issues.filter(
        (issue) => issue.projectId !== undefined && projectIds.has(issue.projectId)
      );
      const recurringKeys = new Set<string>();
      for (const issue of linkedIssues) {
        if ((clusters.get(issue.locationKey)?.length ?? 0) > 1) {
          recurringKeys.add(issue.locationKey);
        }
      }

      let grade: AuthorityGrade;
      if (delayedOrStalledCount === 0 && verifiedSpendSharePercent >= 80 && avgOverdueDays === 0) {
        grade = "A";
      } else if (
        delayedOrStalledCount / Math.max(projectCount, 1) <= 0.5 &&
        verifiedSpendSharePercent >= 50 &&
        avgOverdueDays <= 90
      ) {
        grade = "B";
      } else if (verifiedSpendSharePercent >= 25 && avgOverdueDays <= 180) {
        grade = "C";
      } else {
        grade = "D";
      }

      return {
        authority,
        projectCount,
        completedCount,
        delayedOrStalledCount,
        onTimeRatePercent,
        avgOverdueDays,
        allocatedBdt,
        reportedBdt,
        verifiedBdt,
        verifiedSpendSharePercent,
        linkedIssuesCount: linkedIssues.length,
        recurringLocationsCount: recurringKeys.size,
        grade,
      };
    })
    .sort(
      (a, b) =>
        b.delayedOrStalledCount - a.delayedOrStalledCount ||
        a.verifiedSpendSharePercent - b.verifiedSpendSharePercent ||
        b.allocatedBdt - a.allocatedBdt
    );
}

/* ------------------------------------------------------------------ */
/* Department Operational Accountability Analytics (V2)                */
/* ------------------------------------------------------------------ */

export interface DepartmentPerformance {
  departmentId: string;
  code: string;
  name: string;
  shortName: string;
  totalAssigned: number;
  activeIssues: number;
  verifiedResolutions: number;
  /** Percentage of deadline-bearing issues currently overdue or breached. null = N/A */
  overdueRepairRate: number | null;
  /** Average days from official start/report to repair submission. null = N/A */
  avgRepairDurationDays: number | null;
  /** Average days spent in awaiting_verification. null = N/A */
  avgVerificationDelayDays: number | null;
  /** Percentage of resolved/submitted works completed on or before estimatedRepairDate. null = N/A */
  onTimeCompletionRate: number | null;
  /** Percentage of repair attempts approved on first inspection. null = N/A */
  firstPassVerificationRate: number | null;
  /** Percentage of resolved issues that were reopened or have pending recurrence. null = N/A */
  recurrenceRate: number | null;
}

export function getDepartmentPerformance(
  issues: Issue[] = ISSUES,
  now: string = DEMO_NOW
): DepartmentPerformance[] {
  return DEPARTMENTS.map((dept) => {
    const assigned = issues.filter(
      (issue) => getDepartmentForIssue(issue).id === dept.id
    );
    const active = assigned.filter((issue) => issue.status !== "resolved");
    const verifiedResolutions = assigned.filter(
      (issue) => issue.status === "resolved" && issue.resolutionVerification === "verified"
    ).length;

    const withDeadline = assigned.filter((issue) => Boolean(issue.estimatedRepairDate));
    const overdueCount = withDeadline.filter((issue) => {
      if (issue.slaBreachedAt) return true;
      if (issue.status !== "resolved" && issue.status !== "awaiting_verification") {
        return Boolean(issue.estimatedRepairDate && issue.estimatedRepairDate < now);
      }
      if (issue.status === "resolved") {
        const resDate = issue.resolvedAt ?? issue.updatedAt;
        return Boolean(issue.estimatedRepairDate && resDate > issue.estimatedRepairDate);
      }
      return false;
    }).length;
    const overdueRepairRate =
      withDeadline.length > 0 ? (overdueCount / withDeadline.length) * 100 : null;

    // Average repair duration for submitted/resolved issues with repair attempts
    const durations: number[] = [];
    const verificationDelays: number[] = [];
    let inspectedTotal = 0;
    let firstPassApproved = 0;
    let deadlineTrackable = 0;
    let onTimeCount = 0;

    for (const issue of assigned) {
      const attempts = issue.repairAttempts ?? [];
      if (attempts.length > 0) {
        const firstSubmitted = attempts[0].submittedAt;
        const start = issue.officialResponse?.respondedAt ?? issue.reportedAt;
        durations.push(Math.max(1, daysBetween(start, firstSubmitted)));

        if (issue.estimatedRepairDate && issue.status === "resolved") {
          deadlineTrackable += 1;
          const finish = issue.resolvedAt ?? issue.updatedAt;
          if (!issue.slaBreachedAt && finish <= issue.estimatedRepairDate) {
            onTimeCount += 1;
          }
        }
      }

      for (const attempt of attempts) {
        if (attempt.verification) {
          inspectedTotal += 1;
          verificationDelays.push(
            Math.max(0, daysBetween(attempt.submittedAt, attempt.verification.verifiedAt))
          );
          if (attempt.attemptNumber === 1 && attempt.verification.decision === "approved") {
            firstPassApproved += 1;
          }
        } else if (issue.status === "awaiting_verification") {
          verificationDelays.push(Math.max(0, daysBetween(attempt.submittedAt, now)));
        }
      }
    }

    const avgRepairDurationDays =
      durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : null;

    const avgVerificationDelayDays =
      verificationDelays.length > 0
        ? Math.round(
            (verificationDelays.reduce((a, b) => a + b, 0) / verificationDelays.length) *
              10
          ) / 10
        : null;

    const onTimeCompletionRate =
      deadlineTrackable > 0 ? (onTimeCount / deadlineTrackable) * 100 : null;

    const firstPassVerificationRate =
      inspectedTotal > 0 ? (firstPassApproved / inspectedTotal) * 100 : null;

    const everCompletedOrReopened = assigned.filter(
      (issue) => issue.status === "resolved" || issue.status === "reopened"
    );
    const recurred = everCompletedOrReopened.filter(
      (issue) =>
        issue.status === "reopened" ||
        Boolean(issue.recurrenceRequests?.some((r) => r.status !== "rejected"))
    ).length;
    const recurrenceRate =
      everCompletedOrReopened.length > 0
        ? (recurred / everCompletedOrReopened.length) * 100
        : null;

    return {
      departmentId: dept.id,
      code: dept.code,
      name: dept.name,
      shortName: dept.shortName,
      totalAssigned: assigned.length,
      activeIssues: active.length,
      verifiedResolutions,
      overdueRepairRate,
      avgRepairDurationDays,
      avgVerificationDelayDays,
      onTimeCompletionRate,
      firstPassVerificationRate,
      recurrenceRate,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Project Financial-to-Civic Outcome Summary (V2)                     */
/* ------------------------------------------------------------------ */

export interface ProjectCivicOutcome {
  linkedIssues: Issue[];
  workOrders: string[];
  activeRepairsCount: number;
  overdueRepairsCount: number;
  awaitingVerificationCount: number;
  verifiedRepairsCount: number;
  reopenedOrFailedCount: number;
  repairEvidenceCount: number;
  verifiedEvidenceCount: number;
}

export function getProjectCivicOutcome(
  project: Project,
  issues: Issue[] = ISSUES,
  evidenceItems: Evidence[] = EVIDENCE,
  now: string = DEMO_NOW
): ProjectCivicOutcome {
  const linkedMap = new Map<string, Issue>();
  for (const issue of issues) {
    if (issue.projectId === project.id || issue.locationKey === project.locationKey) {
      linkedMap.set(issue.id, issue);
    }
  }
  const linkedIssues = [...linkedMap.values()];
  const workOrderSet = new Set<string>();

  let activeRepairsCount = 0;
  let overdueRepairsCount = 0;
  let awaitingVerificationCount = 0;
  let verifiedRepairsCount = 0;
  let reopenedOrFailedCount = 0;

  for (const issue of linkedIssues) {
    if (issue.workOrderRef) workOrderSet.add(issue.workOrderRef);
    for (const attempt of issue.repairAttempts ?? []) {
      if (attempt.workOrderRef) workOrderSet.add(attempt.workOrderRef);
    }

    if (issue.status === "in_progress") activeRepairsCount += 1;
    if (issue.status === "awaiting_verification") awaitingVerificationCount += 1;
    if (issue.status === "resolved" && issue.resolutionVerification === "verified") {
      verifiedRepairsCount += 1;
    }
    if (
      issue.status === "reopened" ||
      Boolean(issue.repairAttempts?.some((a) => a.verification?.decision === "rejected"))
    ) {
      reopenedOrFailedCount += 1;
    }
    if (
      issue.status !== "resolved" &&
      issue.status !== "awaiting_verification" &&
      (Boolean(issue.slaBreachedAt) ||
        Boolean(issue.estimatedRepairDate && issue.estimatedRepairDate < now))
    ) {
      overdueRepairsCount += 1;
    }
  }

  const relatedEvidenceIds = new Set<string>(project.evidenceIds);
  for (const issue of linkedIssues) {
    for (const eid of issue.evidenceIds) relatedEvidenceIds.add(eid);
  }
  const projectEvidence = evidenceItems.filter((ev) => relatedEvidenceIds.has(ev.id));
  const verifiedEvidenceCount = projectEvidence.filter((ev) => ev.verified).length;

  return {
    linkedIssues,
    workOrders: [...workOrderSet],
    activeRepairsCount,
    overdueRepairsCount,
    awaitingVerificationCount,
    verifiedRepairsCount,
    reopenedOrFailedCount,
    repairEvidenceCount: projectEvidence.length,
    verifiedEvidenceCount,
  };
}
