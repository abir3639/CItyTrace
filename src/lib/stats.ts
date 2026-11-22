import {
  EVIDENCE,
  ISSUES,
  PROJECTS,
  SECTORS,
  isIssueOpen,
} from "@/data";
import type {
  CivicHealthSummary,
  Issue,
  IssueCategory,
  IssueStatus,
  Project,
  Sector,
} from "@/types/citytrace";
import { ISSUE_CATEGORIES } from "@/types/citytrace";
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

export function getEvidenceCoverage(issues: Issue[] = ISSUES): EvidenceCoverage {
  const projectsWithEvidence = PROJECTS.filter((p) => p.evidenceIds.length > 0);
  const issuesWithEvidence = issues.filter((i) => i.evidenceIds.length > 0);
  const evidenceVerified = EVIDENCE.filter((item) => item.verified).length;

  return {
    evidenceTotal: EVIDENCE.length,
    evidenceVerified,
    verifiedPercent: EVIDENCE.length > 0 ? (evidenceVerified / EVIDENCE.length) * 100 : 0,
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
