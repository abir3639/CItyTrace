import { ISSUES, PROJECTS } from "@/data";
import type { Issue, IssueCategory, Project } from "@/types/citytrace";
import { DEMO_NOW } from "./stats";

/**
 * Dashboard scoping.
 *
 * Two different ideas of "filtered" are used deliberately:
 *
 *  - ATTRIBUTE filters (sector, category) narrow records everywhere, because
 *    they describe what a record *is*.
 *  - The PERIOD filter narrows what *happened* in a window — reports filed,
 *    work completed. Current-state figures (how many issues are open right
 *    now) stay unwindowed, because they describe today, not a date range.
 *
 * Keeping those separate is what stops the dashboard from contradicting itself.
 */

export type PeriodKey = "all" | "12m" | "6m" | "90d";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "12m", label: "Last 12 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "90d", label: "Last 90 days" },
];

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** Start of the selected window, or null for "all time". */
export function periodStart(period: PeriodKey): string | null {
  switch (period) {
    case "all":
      return null;
    case "12m":
      return shiftMonths(DEMO_NOW, -12);
    case "6m":
      return shiftMonths(DEMO_NOW, -6);
    case "90d":
      return shiftDays(DEMO_NOW, -90);
  }
}

export interface AttributeFilters {
  sectorId?: string;
  category?: IssueCategory;
}

export function applyIssueAttributes(issues: Issue[], filters: AttributeFilters): Issue[] {
  return issues.filter((issue) => {
    if (filters.sectorId && issue.sectorId !== filters.sectorId) return false;
    if (filters.category && issue.category !== filters.category) return false;
    return true;
  });
}

export function applyIssuePeriod(issues: Issue[], period: PeriodKey): Issue[] {
  const start = periodStart(period);
  if (!start) return issues;
  return issues.filter((issue) => issue.reportedAt >= start);
}

export function applyProjectAttributes(
  projects: Project[] = PROJECTS,
  filters: AttributeFilters
): Project[] {
  return projects.filter((project) => {
    if (filters.sectorId && project.sectorId !== filters.sectorId) return false;
    if (filters.category && project.category !== filters.category) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Historical trend                                                    */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  /** YYYY-MM, used as the chart category. */
  month: string;
  label: string;
  reported: number;
  resolved: number;
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

/**
 * Monthly counts of reports filed and issues resolved.
 *
 * `from` is the window start; when absent the trend runs from the first
 * recorded report so the whole history is visible.
 */
export function buildTrend(issues: Issue[], from: string | null): TrendPoint[] {
  const reportedMonths = issues.map((issue) => issue.reportedAt.slice(0, 7)).sort();
  const startMonth = from ? from.slice(0, 7) : reportedMonths[0] ?? DEMO_NOW.slice(0, 7);
  const endMonth = DEMO_NOW.slice(0, 7);

  const months: string[] = [];
  let cursor = startMonth;
  // Guard against a malformed range producing an unbounded loop.
  for (let index = 0; index < 48; index += 1) {
    months.push(cursor);
    if (cursor === endMonth) break;
    const date = new Date(`${cursor}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    cursor = date.toISOString().slice(0, 7);
  }

  return months.map((month) => {
    const reported = issues.filter((issue) => issue.reportedAt.slice(0, 7) === month).length;
    const resolved = issues.filter(
      (issue) => issue.resolvedAt !== undefined && issue.resolvedAt.slice(0, 7) === month
    ).length;
    return {
      month,
      label: MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`)),
      reported,
      resolved,
    };
  });
}

/** All seeded issues, exposed so the dashboard never reaches into the module directly. */
export const SEEDED_ISSUES = ISSUES;
