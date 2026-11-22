/**
 * CITYTRACE — shared domain model.
 *
 * The platform is built on four related entities rather than one flat record:
 *
 *   Sector ──< Issue >── Project ──< Milestone
 *      │          │           │
 *      └──< Evidence >─────────┘
 *
 * Keeping these separate is what makes recurring-problem detection, sector
 * comparison, and evidence-coverage scoring possible without hardcoding
 * statistics anywhere.
 *
 * ALL DATA IN THIS APPLICATION IS SIMULATED DEMONSTRATION DATA.
 */

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Map/3D position on the demo ground plane: [x, z]. */
export type MapPosition = [number, number];

/* ------------------------------------------------------------------ */
/* Sectors                                                             */
/* ------------------------------------------------------------------ */

export interface Sector {
  id: string;
  /** Short code shown in dense UI, e.g. "S04". */
  code: string;
  name: string;
  ward: string;
  /** Camera focus point for the 3D city explorer. */
  center: MapPosition;
  populationEstimate: number;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Shared vocabularies                                                 */
/* ------------------------------------------------------------------ */

export type IssueCategory =
  | "road"
  | "drainage"
  | "streetlight"
  | "waste"
  | "water"
  | "public-safety";

export type Severity = "critical" | "high" | "moderate" | "low";

/** The six civic categories used across issues, projects and filters. */
export const ISSUE_CATEGORIES: readonly IssueCategory[] = [
  "road",
  "drainage",
  "streetlight",
  "waste",
  "water",
  "public-safety",
] as const;

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  road: "Road",
  drainage: "Drainage",
  streetlight: "Streetlight",
  waste: "Waste",
  water: "Water",
  "public-safety": "Public Safety",
};

/* ------------------------------------------------------------------ */
/* Issues — permanent civic record, survives resolution                */
/* ------------------------------------------------------------------ */

export type IssueStatus =
  | "reported"
  | "under-review"
  | "in-progress"
  | "resolved"
  | "reopened";

export const ISSUE_STATUS_ORDER: readonly IssueStatus[] = [
  "reported",
  "under-review",
  "in-progress",
  "resolved",
  "reopened",
] as const;

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  reported: "Reported",
  "under-review": "Under Review",
  "in-progress": "In Progress",
  resolved: "Resolved",
  reopened: "Reopened",
};

export type IssueActor =
  | "citizen"
  | "municipal-desk"
  | "field-team"
  | "system";

/** One entry in an issue's permanent audit trail. */
export interface IssueEvent {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  at: string;
  status: IssueStatus;
  note: string;
  actor: IssueActor;
}

export interface Issue {
  id: string;
  code: string;
  title: string;
  category: IssueCategory;
  description: string;
  sectorId: string;
  /** Human-readable street/locality. */
  location: string;
  /**
   * Stable key for the physical spot. Two issues sharing a locationKey are
   * reports of the same underlying civic problem — this powers recurring
   * problem detection instead of fuzzy text matching.
   */
  locationKey: string;
  coordinates: MapPosition;
  status: IssueStatus;
  severity: Severity;
  reportedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  /** How many citizen reports are aggregated into this record. */
  reportCount: number;
  /** Set when this record reopens an earlier, previously resolved issue. */
  reopensIssueId?: string;
  projectId?: string;
  evidenceIds: string[];
  history: IssueEvent[];
}

/* ------------------------------------------------------------------ */
/* Projects — publicly funded works with money and milestones          */
/* ------------------------------------------------------------------ */

export type ProjectStatus =
  | "planned"
  | "active"
  | "delayed"
  | "completed"
  | "stalled";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  delayed: "Delayed",
  completed: "Completed",
  stalled: "Stalled",
};

export type MilestoneStatus = "pending" | "in-progress" | "met" | "missed";

export interface Milestone {
  id: string;
  title: string;
  /** ISO date the milestone was scheduled for. */
  plannedDate: string;
  /** ISO date it was actually achieved, when it was. */
  actualDate?: string;
  status: MilestoneStatus;
  note?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  category: IssueCategory;
  sectorId: string;
  location: string;
  locationKey: string;
  authority: string;
  status: ProjectStatus;
  severity: Severity;
  coordinates: MapPosition;
  startDate: string;
  plannedCompletionDate: string;
  actualCompletionDate?: string;
  allocatedBudgetBdt: number;
  reportedExpenditureBdt: number;
  /**
   * Independently verified spend. `undefined` means no verified financial
   * evidence exists — the UI must show "missing", never assume the reported
   * figure is correct.
   */
  verifiedExpenditureBdt?: number;
  verifiedProgressPercent: number;
  milestones: Milestone[];
  evidenceIds: string[];
  issueIds: string[];
  /** Free-text note recorded against the last work order. */
  workNote?: string;
}

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type EvidenceKind =
  | "photo"
  | "document"
  | "measurement"
  | "satellite"
  | "sensor";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  /** ISO date the evidence was captured or filed. */
  capturedAt: string;
  source: string;
  /** Whether a municipal verifier has signed off on this item. */
  verified: boolean;
  description: string;
  /** Simulated archive reference, e.g. "WO-2024-0114". */
  ref?: string;
  /**
   * Inline image for citizen-uploaded evidence, stored as a data URL.
   * Seed evidence uses generated tiles instead.
   */
  dataUrl?: string;
}

/* ------------------------------------------------------------------ */
/* Derived 3D map features                                             */
/* ------------------------------------------------------------------ */

export type MapFeatureKind = "issue" | "project";

export type MapFeatureState = "unresolved" | "delayed" | "active" | "completed";

/** A single clickable beacon in the 3D city explorer. */
export interface MapFeature {
  id: string;
  /** id of the underlying issue or project. */
  refId: string;
  kind: MapFeatureKind;
  state: MapFeatureState;
  label: string;
  sublabel: string;
  coordinates: MapPosition;
  sectorId: string;
  severity: Severity;
}

/* ------------------------------------------------------------------ */
/* AI investigation report                                             */
/* ------------------------------------------------------------------ */

export interface EvidenceCitation {
  label: string;
  fact: string;
  significance: string;
  /**
   * ids of the records this citation is drawn from, so every AI finding can
   * link back to the evidence that produced it.
   */
  recordRefs?: string[];
}

export interface InvestigationReport {
  caseId: string;
  source: "gemini" | "demo-fallback";
  model: string;
  generatedAt: string;
  headline: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  executiveSummary: string;
  repairHistoryAnalysis: string;
  delayAnalysis: string;
  budgetAnalysis: string;
  inconsistencies: string[];
  evidenceCitations: EvidenceCitation[];
  recommendedVerifySteps: string[];
  /** Information that is absent and would change the conclusion. */
  missingInformation?: string[];
}

/* ------------------------------------------------------------------ */
/* Aggregates (computed — never stored)                                */
/* ------------------------------------------------------------------ */

export interface CivicHealthSummary {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  reopenedIssues: number;
  recurringClusters: number;
  totalProjects: number;
  activeProjects: number;
  delayedProjects: number;
  completedProjects: number;
  allocatedBudgetBdt: number;
  reportedExpenditureBdt: number;
  verifiedExpenditureBdt: number;
  projectsWithVerifiedSpend: number;
}
