import type {
  Evidence,
  Issue,
  MapFeature,
  Project,
  Sector,
} from "@/types/citytrace";
import { EVIDENCE } from "./evidence";
import { ISSUES } from "./issues";
import { PROJECTS } from "./projects";
import { SECTORS } from "./sectors";

export { EVIDENCE, ISSUES, PROJECTS, SECTORS };

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export const sectorsById = new Map<string, Sector>(
  SECTORS.map((sector) => [sector.id, sector])
);

export const projectsById = new Map<string, Project>(
  PROJECTS.map((project) => [project.id, project])
);

export const issuesById = new Map<string, Issue>(
  ISSUES.map((issue) => [issue.id, issue])
);

export const evidenceById = new Map<string, Evidence>(
  EVIDENCE.map((item) => [item.id, item])
);

/* ------------------------------------------------------------------ */
/* Relationship helpers                                                */
/* ------------------------------------------------------------------ */

export function getSector(id: string): Sector | undefined {
  return sectorsById.get(id);
}

export function getProject(id: string): Project | undefined {
  return projectsById.get(id);
}

export function getIssue(id: string): Issue | undefined {
  return issuesById.get(id);
}

export function getEvidence(ids: readonly string[]): Evidence[] {
  return ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is Evidence => item !== undefined);
}

export function getProjectsForSector(sectorId: string): Project[] {
  return PROJECTS.filter((project) => project.sectorId === sectorId);
}

export function getIssuesForSector(sectorId: string): Issue[] {
  return ISSUES.filter((issue) => issue.sectorId === sectorId);
}

export function getIssuesForProject(projectId: string): Issue[] {
  return ISSUES.filter((issue) => issue.projectId === projectId);
}

/** Every issue recorded at a physical location, newest last. */
export function getIssuesAtLocation(locationKey: string): Issue[] {
  return ISSUES.filter((issue) => issue.locationKey === locationKey).sort((a, b) =>
    a.reportedAt.localeCompare(b.reportedAt)
  );
}

/**
 * Groups issues by physical location. Any location with more than one issue is
 * a recurring civic problem — the basis for recurring-failure detection.
 */
export function getRecurrenceClusters(): Map<string, Issue[]> {
  const clusters = new Map<string, Issue[]>();
  for (const issue of ISSUES) {
    const existing = clusters.get(issue.locationKey);
    if (existing) {
      existing.push(issue);
    } else {
      clusters.set(issue.locationKey, [issue]);
    }
  }
  for (const [, group] of clusters) {
    group.sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
  }
  return clusters;
}

/** Follows reopensIssueId back to the first report of a problem. */
export function getIssueChain(issue: Issue): Issue[] {
  const chain: Issue[] = [issue];
  const seen = new Set<string>([issue.id]);
  let cursor = issue.reopensIssueId;
  while (cursor && !seen.has(cursor)) {
    const previous = issuesById.get(cursor);
    if (!previous) break;
    chain.unshift(previous);
    seen.add(cursor);
    cursor = previous.reopensIssueId;
  }
  return chain;
}

export function isIssueOpen(issue: Issue): boolean {
  return issue.status !== "resolved";
}

/* ------------------------------------------------------------------ */
/* Derived 3D map features                                             */
/* ------------------------------------------------------------------ */

/**
 * Builds the clickable beacons for the 3D city explorer.
 *
 * Resolved issues are intentionally excluded: the map shows the city's current
 * condition, while the permanent history lives in the Civic Issues module.
 */
export function toMapFeatures(issues: Issue[] = ISSUES): MapFeature[] {
  const features: MapFeature[] = [];

  for (const issue of issues) {
    if (!isIssueOpen(issue)) continue;
    features.push({
      id: `issue:${issue.id}`,
      refId: issue.id,
      kind: "issue",
      state: "unresolved",
      label: issue.code,
      sublabel: issue.title,
      coordinates: issue.coordinates,
      sectorId: issue.sectorId,
      severity: issue.severity,
    });
  }

  for (const project of PROJECTS) {
    const state =
      project.status === "completed"
        ? "completed"
        : project.status === "delayed" || project.status === "stalled"
          ? "delayed"
          : "active";
    features.push({
      id: `project:${project.id}`,
      refId: project.id,
      kind: "project",
      state,
      label: project.code,
      sublabel: project.name,
      coordinates: project.coordinates,
      sectorId: project.sectorId,
      severity: project.severity,
    });
  }

  return features;
}

/* ------------------------------------------------------------------ */
/* Referential integrity                                               */
/* ------------------------------------------------------------------ */

/**
 * Confirms every cross-reference in the seed data resolves, and that related
 * records agree about the physical location they describe.
 *
 * Run during development through `/api/_data-check`; a clean result means the
 * demo has no dangling links or contradictory records.
 */
export function validateDataset(): string[] {
  const problems: string[] = [];

  const sectorIds = new Set(SECTORS.map((sector) => sector.id));
  const issueIds = new Set(ISSUES.map((issue) => issue.id));
  const projectIds = new Set(PROJECTS.map((project) => project.id));
  const evidenceIds = new Set(EVIDENCE.map((item) => item.id));

  const push = (message: string) => problems.push(message);

  // Sectors
  for (const sector of SECTORS) {
    if (getProjectsForSector(sector.id).length === 0) {
      push(`Sector ${sector.id} has no projects.`);
    }
    if (getIssuesForSector(sector.id).length === 0) {
      push(`Sector ${sector.id} has no issues.`);
    }
  }

  // Issues
  for (const issue of ISSUES) {
    if (!sectorIds.has(issue.sectorId)) {
      push(`Issue ${issue.id} references unknown sector ${issue.sectorId}.`);
    }
    if (issue.projectId && !projectIds.has(issue.projectId)) {
      push(`Issue ${issue.id} references unknown project ${issue.projectId}.`);
    }
    if (issue.reopensIssueId && !issueIds.has(issue.reopensIssueId)) {
      push(`Issue ${issue.id} reopens unknown issue ${issue.reopensIssueId}.`);
    }
    for (const id of issue.evidenceIds) {
      if (!evidenceIds.has(id)) {
        push(`Issue ${issue.id} references unknown evidence ${id}.`);
      }
    }
    if (!issue.history.length) {
      push(`Issue ${issue.id} has no history events.`);
    }
    const lastEvent = issue.history[issue.history.length - 1];
    if (lastEvent.status !== issue.status) {
      push(
        `Issue ${issue.id} status "${issue.status}" does not match the last history event "${lastEvent.status}".`
      );
    }
    if (issue.status === "resolved" && !issue.resolvedAt) {
      push(`Issue ${issue.id} is resolved but has no resolvedAt date.`);
    }
    if (issue.status !== "resolved" && issue.resolvedAt) {
      push(`Issue ${issue.id} has a resolvedAt date but status "${issue.status}".`);
    }
    // A reopened issue must point at the earlier record it revives.
    if (issue.status === "reopened" && !issue.reopensIssueId) {
      push(`Issue ${issue.id} is reopened but does not reference the earlier issue.`);
    }
    // Project ↔ issue links must be declared on both sides.
    if (issue.projectId) {
      const project = projectsById.get(issue.projectId);
      if (project && !project.issueIds.includes(issue.id)) {
        push(
          `Issue ${issue.id} points at project ${project.id}, but that project does not list the issue.`
        );
      }
    }
  }

  // Projects
  for (const project of PROJECTS) {
    if (!sectorIds.has(project.sectorId)) {
      push(`Project ${project.id} references unknown sector ${project.sectorId}.`);
    }
    for (const id of project.evidenceIds) {
      if (!evidenceIds.has(id)) {
        push(`Project ${project.id} references unknown evidence ${id}.`);
      }
    }
    for (const id of project.issueIds) {
      const linked = issuesById.get(id);
      if (!linked) {
        push(`Project ${project.id} references unknown issue ${id}.`);
        continue;
      }
      if (linked.projectId !== project.id) {
        push(
          `Project ${project.id} lists issue ${id}, but that issue points at ${linked.projectId ?? "no project"}.`
        );
      }
    }
    if (!project.milestones.length) {
      push(`Project ${project.id} has no milestones.`);
    }
    if (project.reportedExpenditureBdt > project.allocatedBudgetBdt) {
      push(
        `Project ${project.id} spends ${project.reportedExpenditureBdt} against an allocation of ${project.allocatedBudgetBdt}.`
      );
    }
    if (
      project.verifiedExpenditureBdt !== undefined &&
      project.verifiedExpenditureBdt > project.reportedExpenditureBdt
    ) {
      push(
        `Project ${project.id} has verified spend above reported spend.`
      );
    }
    if (project.status === "completed" && !project.actualCompletionDate) {
      push(`Project ${project.id} is completed but has no actual completion date.`);
    }
    for (const milestone of project.milestones) {
      if (milestone.status === "met") {
        if (!milestone.actualDate) {
          push(`Milestone ${milestone.id} is met but has no actual date.`);
        } else if (milestone.actualDate > milestone.plannedDate) {
          push(
            `Milestone ${milestone.id} is met but its actual date falls after the planned date.`
          );
        }
      }
      if (
        milestone.status === "missed" &&
        milestone.actualDate &&
        milestone.actualDate <= milestone.plannedDate
      ) {
        push(
          `Milestone ${milestone.id} is missed but was completed on or before its planned date.`
        );
      }
      if (
        (milestone.status === "pending" || milestone.status === "in-progress") &&
        milestone.actualDate
      ) {
        push(
          `Milestone ${milestone.id} is ${milestone.status} but carries an actual date.`
        );
      }
    }
  }

  // Evidence must be reachable from at least one record.
  for (const item of EVIDENCE) {
    const used =
      ISSUES.some((issue) => issue.evidenceIds.includes(item.id)) ||
      PROJECTS.some((project) => project.evidenceIds.includes(item.id));
    if (!used) {
      push(`Evidence ${item.id} is not attached to any record.`);
    }
  }

  return problems;
}
