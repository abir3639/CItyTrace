/**
 * CITYTRACE — shared domain model (Civic Accountability System V2).
 *
 *   Sector ──< Issue >── Project ──< Milestone
 *      │          │           │
 *      └──< Evidence >────────┘
 *                 │
 *      Users · Departments · SLAs · Repair Cycles · Accountability Timeline
 *
 * ALL DATA IN THIS APPLICATION IS SIMULATED DEMONSTRATION DATA.
 */

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Map/3D position on the demo ground plane: [x, z]. */
export type MapPosition = [number, number];

/* ------------------------------------------------------------------ */
/* Sectors & Departments                                               */
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

export interface Department {
  id: string;
  code: string;
  name: string;
  shortName: string;
  categories: IssueCategory[];
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
/* Formal Issue State Machine                                          */
/* ------------------------------------------------------------------ */

export type IssueStatus =
  | "reported"
  | "under_review"
  | "in_progress"
  | "awaiting_verification"
  | "resolved"
  | "reopened";

export const ISSUE_STATUS_ORDER: readonly IssueStatus[] = [
  "reported",
  "under_review",
  "in_progress",
  "awaiting_verification",
  "resolved",
  "reopened",
] as const;

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  reported: "Reported",
  under_review: "Under Review",
  in_progress: "In Progress",
  awaiting_verification: "Awaiting Verification",
  resolved: "Resolved",
  reopened: "Reopened",
};

export type IssueActor =
  | "citizen"
  | "municipal-desk"
  | "field-team"
  | "system";

/* ------------------------------------------------------------------ */
/* Accounts & civic attribution                                        */
/* ------------------------------------------------------------------ */

export type UserRole = "citizen" | "verifier" | "official";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  citizen: "Citizen",
  verifier: "Civic Verifier",
  official: "Municipal Official",
};

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sectorId: string;
  departmentId?: string;
  initials: string;
  avatarColor: string;
  joinedAt: string;
}

export interface UserRef {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
  sectorId?: string;
  departmentId?: string;
}

export interface IssueVote {
  userId: string;
  userName: string;
  userRole: UserRole;
  userInitials: string;
  avatarColor: string;
  votedAt: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* SLA, Official Responses, Repair Cycles & Accountability Timeline    */
/* ------------------------------------------------------------------ */

export type SlaState =
  | "awaiting_official_response"
  | "on_track"
  | "due_soon"
  | "overdue"
  | "repair_submitted"
  | "verification_pending"
  | "resolved_within_deadline"
  | "resolved_after_deadline";

export const SLA_STATE_LABELS: Record<SlaState, string> = {
  awaiting_official_response: "Awaiting Official Response",
  on_track: "On Track",
  due_soon: "Due Soon",
  overdue: "Overdue",
  repair_submitted: "Repair Submitted",
  verification_pending: "Verification Pending",
  resolved_within_deadline: "Resolved Within Deadline",
  resolved_after_deadline: "Resolved After Deadline",
};

export interface OfficialResponse {
  message: string;
  respondedBy: UserRef;
  respondedAt: string;
  departmentId: string;
  assignedTeam?: string;
  workOrderRef?: string;
}

export interface DeadlineChange {
  id: string;
  previousDate?: string;
  newDate: string;
  reason: string;
  changedBy: UserRef;
  changedAt: string;
  breachedPriorDeadline: boolean;
}

export interface RepairVerification {
  decision: "approved" | "rejected";
  verifiedBy: UserRef;
  verifiedAt: string;
  notes: string;
  evidenceIds: string[];
}

export interface RepairAttempt {
  id: string;
  attemptNumber: number;
  submittedBy: UserRef;
  submittedAt: string;
  completionDate: string;
  resolutionNotes: string;
  workOrderRef?: string;
  evidenceIds: string[];
  verification?: RepairVerification;
}

export interface RecurrenceRequest {
  id: string;
  requestedBy: UserRef;
  requestedAt: string;
  reason: string;
  evidenceIds: string[];
  status: "pending" | "approved" | "rejected";
  reviewedBy?: UserRef;
  reviewedAt?: string;
  reviewNotes?: string;
}

export type AccountabilityEventType =
  | "issue_created"
  | "evidence_submitted"
  | "evidence_verified"
  | "evidence_flagged"
  | "evidence_revoked"
  | "status_changed"
  | "department_assigned"
  | "official_response"
  | "project_linked"
  | "deadline_set"
  | "deadline_changed"
  | "sla_breached"
  | "repair_submitted"
  | "repair_approved"
  | "repair_rejected"
  | "recurrence_requested"
  | "issue_reopened"
  | "issue_resolved";

export interface AccountabilityEvent {
  id: string;
  type: AccountabilityEventType;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorInitials: string;
  actorAvatarColor: string;
  timestamp: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  evidenceIds?: string[];
  projectId?: string;
  workOrderRef?: string;
}

/** One entry in an issue's permanent audit trail. */
export interface IssueEvent {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  at: string;
  status: IssueStatus;
  note: string;
  actor: IssueActor;
  actorName?: string;
  actorUserId?: string;
  actorRole?: UserRole;
  actorInitials?: string;
  actorAvatarColor?: string;
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
  reportedBy?: UserRef;
  votes?: IssueVote[];
  /* ---------------- Civic Accountability V2 fields ---------------- */
  version?: number;
  departmentId?: string;
  assignedTeam?: string;
  workOrderRef?: string;
  officialResponse?: OfficialResponse;
  estimatedRepairDate?: string;
  deadlineHistory?: DeadlineChange[];
  slaBreachedAt?: string;
  repairAttempts?: RepairAttempt[];
  resolutionVerification?: "verified" | "legacy_unverified";
  recurrenceRequests?: RecurrenceRequest[];
  accountabilityTimeline?: AccountabilityEvent[];
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
/* Evidence V2                                                         */
/* ------------------------------------------------------------------ */

export type EvidenceKind =
  | "photo"
  | "document"
  | "measurement"
  | "satellite"
  | "sensor";

export type EvidenceCategory =
  | "citizen_report"
  | "site_inspection"
  | "official_repair"
  | "independent_verification"
  | "supporting_document";

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  citizen_report: "Citizen Report",
  site_inspection: "Site Inspection",
  official_repair: "Official Repair Evidence",
  independent_verification: "Independent Repair Verification",
  supporting_document: "Supporting Document",
};

export type EvidenceVerificationStatus = "unverified" | "verified" | "flagged";

export interface EvidenceVerificationEvent {
  id: string;
  action: "verified" | "flagged" | "revoked";
  actor: UserRef;
  at: string;
  reason: string;
}

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  /** ISO date the evidence was captured or filed. */
  capturedAt: string;
  source: string;
  /** Whether a verifier has signed off on this item. */
  verified: boolean;
  description: string;
  /** Simulated archive reference, e.g. "WO-2024-0114". */
  ref?: string;
  /**
   * Inline image for uploaded evidence, stored as a data URL.
   * Seed evidence uses generated tiles instead.
   */
  dataUrl?: string;
  /* ---------------- Civic Accountability V2 fields ---------------- */
  category?: EvidenceCategory;
  status?: EvidenceVerificationStatus;
  uploadedBy?: UserRef;
  uploadedAt?: string;
  issueId?: string;
  projectId?: string;
  verifiedBy?: UserRef;
  verifiedAt?: string;
  verificationReason?: string;
  verificationHistory?: EvidenceVerificationEvent[];
}

/* ------------------------------------------------------------------ */
/* Derived 3D map features                                             */
/* ------------------------------------------------------------------ */

export type MapFeatureKind = "issue" | "project";

export type MapFeatureState = "unresolved" | "delayed" | "active" | "completed";

export type AccountabilityPinTone =
  | "reported"
  | "under_review"
  | "in_progress"
  | "awaiting_verification"
  | "alert"
  | "verified_resolved";

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
  /* ---------------- Civic Accountability V2 fields ---------------- */
  pinTone?: AccountabilityPinTone;
  issueStatus?: IssueStatus;
  slaState?: SlaState;
  hasWarning?: boolean;
  departmentId?: string;
}

/* ------------------------------------------------------------------ */
/* Watchlist & Personalized Notifications                              */
/* ------------------------------------------------------------------ */

export type WatchlistEntityType = "issue" | "sector" | "project";

export interface UserWatchlist {
  issues: string[];
  sectors: string[];
  projects: string[];
}

export type NotificationCategory =
  | "new_issue"
  | "official_response"
  | "status_update"
  | "deadline_change"
  | "sla_breach"
  | "repair_submitted"
  | "verification_outcome"
  | "reopened_issue"
  | "project_update";

export interface UserNotification {
  id: string;
  dedupeKey: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  href: string;
  at: string;
  read: boolean;
  issueId?: string;
  sectorId?: string;
  projectId?: string;
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
