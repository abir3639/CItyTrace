import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EVIDENCE, ISSUES, PROJECTS, SECTORS } from "@/data";
import type {
  AccountabilityEvent,
  Evidence,
  EvidenceVerificationStatus,
  Issue,
  IssueActor,
  IssueCategory,
  IssueEvent,
  IssueStatus,
  IssueVote,
  MapPosition,
  PublicUser,
  RecurrenceRequest,
  RepairAttempt,
} from "@/types/citytrace";
import { ISSUE_STATUS_LABELS } from "@/types/citytrace";
import { SEEDED_PUBLIC_USERS, toUserRef } from "./auth-store";
import { getDepartment, getDepartmentForIssue } from "./departments";
import { dispatchAccountabilityNotifications } from "./governance-store";
import { canUserPerform, isValidTransition, normalizeIssueStatus } from "./permissions";
import { DEMO_NOW } from "./stats";

/**
 * Runtime civic issue, evidence verification, repair cycle, and accountability timeline store.
 *
 * Single source of truth consumed by Issue Management, Evidence Gallery, City Explorer,
 * Money Tracker, AI Investigation, Role Action Centres, and Notifications.
 *
 * Persisted in OS temp directory (`citytrace-runtime-issues.json`) and cleared
 * cleanly via `npm run reset:demo`.
 *
 * Server-only — never import this from a client component.
 */

const STORE_FILE = path.join(os.tmpdir(), "citytrace-runtime-issues.json");

interface StoreShape {
  created: Issue[];
  overrides: Record<string, Issue>;
  evidence: Evidence[];
  evidenceOverrides: Record<string, Evidence>;
}

function readStore(): StoreShape {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      created: Array.isArray(parsed.created) ? parsed.created : [],
      overrides:
        parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      evidenceOverrides:
        parsed.evidenceOverrides && typeof parsed.evidenceOverrides === "object"
          ? parsed.evidenceOverrides
          : {},
    };
  } catch {
    return { created: [], overrides: {}, evidence: [], evidenceOverrides: {} };
  }
}

function writeStore(store: StoreShape): void {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100_000;
  }
  return hash;
}

const SEEDED_VOTE_NOTES: Record<string, string[]> = {
  "ISS-003": [
    "Measured 12 cm standing water near junction approach after light rain.",
    "Confirmed catch-pit inlet remains sealed beneath fresh asphalt.",
  ],
  "ISS-005": [
    "Water reached doorstep level along Block B after evening shower.",
    "Confirmed box culvert outfall discharge gate is still closed.",
  ],
  "ISS-020": ["Walked underpass at 20:30 — corridor fixtures remain unpowered."],
};

/* ------------------------------------------------------------------ */
/* Seeded Evidence V2 enrichment (zero fabricated legacy sign-offs)    */
/* ------------------------------------------------------------------ */

const SYNTHETIC_REPAIR_EVIDENCE: Evidence[] = [
  {
    id: "EV-ISS-L09-R1",
    kind: "photo",
    title: "Overhead junction box & cable splice completion photo",
    capturedAt: "2025-07-17",
    source: "Lighting & Waste Unit",
    verified: false,
    status: "unverified",
    category: "official_repair",
    issueId: "ISS-016",
    projectId: "P-L09",
    description:
      "Repair completion photograph submitted by field team alongside work order WO-2025-0715; awaiting independent Civic Verifier inspection.",
    ref: "WO-2025-0715",
  },
];

function enrichEvidenceV2(item: Evidence, issuesContext?: Issue[]): Evidence {
  const citizenFarhana = SEEDED_PUBLIC_USERS[0];
  const verifierNusrat = SEEDED_PUBLIC_USERS[2];
  const officialRoads = SEEDED_PUBLIC_USERS[3];
  const officialDrainage = SEEDED_PUBLIC_USERS[4];

  const sourceLower = item.source.toLowerCase();
  const isCitizen = sourceLower.includes("citizen");
  const isVerifier = sourceLower.includes("independent") || sourceLower.includes("surveyor") || sourceLower.includes("lab");

  const linkedIssue = issuesContext?.find((iss) => iss.evidenceIds.includes(item.id));
  const linkedProject = PROJECTS.find((p) => p.evidenceIds.includes(item.id));

  const uploader =
    item.uploadedBy ??
    toUserRef(
      isCitizen
        ? citizenFarhana
        : isVerifier
          ? verifierNusrat
          : linkedProject?.category === "drainage" || linkedProject?.category === "water"
            ? officialDrainage
            : officialRoads
    );

  // Flagged core-cut asphalt depth log on P-R01 / ISS-003 scenario
  if (item.id === "EV-PR01-02" && !item.status) {
    return {
      ...item,
      category: "site_inspection",
      status: "flagged",
      verified: false,
      uploadedBy: toUserRef(officialRoads),
      uploadedAt: item.capturedAt,
      issueId: "ISS-003",
      projectId: "P-R01",
      verifiedBy: toUserRef(verifierNusrat),
      verifiedAt: "2025-07-14",
      verificationReason:
        "3 of 6 asphalt core samples measured below BOQ wearing-course specification.",
      verificationHistory: [
        {
          id: "EV-PR01-02-V1",
          action: "flagged",
          actor: toUserRef(verifierNusrat),
          at: "2025-07-14",
          reason:
            "3 of 6 asphalt core samples measured below BOQ wearing-course specification.",
        },
      ],
    };
  }

  const status: EvidenceVerificationStatus =
    item.status ?? (item.verified ? "verified" : "unverified");

  const category =
    item.category ??
    (isCitizen
      ? "citizen_report"
      : isVerifier
        ? "site_inspection"
        : item.verified && item.ref?.startsWith("WO-")
          ? "official_repair"
          : "supporting_document");

  const verifierActor =
    item.verifiedBy ?? (status === "verified" ? toUserRef(verifierNusrat) : undefined);

  return {
    ...item,
    category,
    status,
    verified: status === "verified",
    uploadedBy: uploader,
    uploadedAt: item.uploadedAt ?? item.capturedAt,
    issueId: item.issueId ?? linkedIssue?.id,
    projectId: item.projectId ?? linkedProject?.id,
    ...(verifierActor ? { verifiedBy: verifierActor } : {}),
    ...(status !== "unverified" && !item.verifiedAt ? { verifiedAt: item.capturedAt } : {}),
    ...(status === "verified" && !item.verificationReason
      ? { verificationReason: "Cross-checked against archived field & measurement logs." }
      : {}),
    verificationHistory:
      item.verificationHistory ??
      (status !== "unverified" && verifierActor
        ? [
            {
              id: `${item.id}-VH1`,
              action: status === "flagged" ? "flagged" : "verified",
              actor: verifierActor,
              at: item.verifiedAt ?? item.capturedAt,
              reason:
                item.verificationReason ??
                "Cross-checked against archived field & measurement logs.",
            },
          ]
        : []),
  };
}

/* ------------------------------------------------------------------ */
/* Seeded Issue V2 enrichment & evaluator scenarios                    */
/* ------------------------------------------------------------------ */

function actorEventFromHistory(
  event: IssueEvent,
  issue: Issue,
  sectorCitizen: PublicUser,
  verifierUser: PublicUser,
  officialUser: PublicUser
): AccountabilityEvent {
  const assigned =
    event.actorUserId
      ? {
          id: event.actorUserId,
          name: event.actorName ?? "CityTrace User",
          role: event.actorRole ?? "citizen",
          initials: event.actorInitials ?? "CT",
          avatarColor: event.actorAvatarColor ?? "#007AFF",
        }
      : event.actor === "citizen"
        ? sectorCitizen
        : event.actor === "municipal-desk"
          ? verifierUser
          : officialUser;

  const type =
    event.status === "resolved"
      ? "issue_resolved"
      : event.status === "reopened"
        ? "issue_reopened"
        : event.status === "awaiting_verification"
          ? "repair_submitted"
          : event.status === "reported"
            ? "issue_created"
            : "status_changed";

  return {
    id: `AE-${event.id}`,
    type,
    actorId: assigned.id,
    actorName: assigned.name,
    actorRole: assigned.role,
    actorInitials: assigned.initials,
    actorAvatarColor: assigned.avatarColor,
    timestamp: event.at,
    description: event.note,
    newValue: ISSUE_STATUS_LABELS[event.status],
    ...(issue.projectId ? { projectId: issue.projectId } : {}),
  };
}

function enrichIssueV2(rawIssue: Issue): Issue {
  const status = normalizeIssueStatus(rawIssue.status) ?? "reported";
  const citizenPool = SEEDED_PUBLIC_USERS.filter((u) => u.role === "citizen");
  const verifierUser =
    SEEDED_PUBLIC_USERS.find((u) => u.role === "verifier") ?? SEEDED_PUBLIC_USERS[0];
  const officialRoads =
    SEEDED_PUBLIC_USERS.find((u) => u.departmentId === "DEPT-ROADS") ??
    SEEDED_PUBLIC_USERS[3];
  const officialDrainage =
    SEEDED_PUBLIC_USERS.find((u) => u.departmentId === "DEPT-DRAINAGE") ??
    SEEDED_PUBLIC_USERS[4] ??
    officialRoads;

  // Special departmental assignment: ISS-003 belongs to P-R01 (Roads & Highways Cell)
  const dept =
    rawIssue.id === "ISS-003"
      ? getDepartment("DEPT-ROADS")!
      : getDepartmentForIssue({
          departmentId: rawIssue.departmentId,
          category: rawIssue.category,
        });
  const deptOfficial = dept.id === "DEPT-DRAINAGE" ? officialDrainage : officialRoads;

  const seedHash = hashText(rawIssue.id);
  const sectorCitizen =
    citizenPool.find((u) => u.sectorId === rawIssue.sectorId) ??
    citizenPool[seedHash % citizenPool.length];
  const reporter = rawIssue.reportedBy ?? toUserRef(sectorCitizen);

  let votes: IssueVote[];
  if (rawIssue.votes) {
    votes = rawIssue.votes;
  } else {
    const noteList = SEEDED_VOTE_NOTES[rawIssue.id] ?? [];
    const baseVoters = [
      sectorCitizen,
      ...citizenPool.filter((u) => u.id !== sectorCitizen.id),
      verifierUser,
    ];
    const count = Math.min(baseVoters.length, Math.max(1, Math.min(3, rawIssue.reportCount)));
    votes = baseVoters.slice(0, count).map((voter, idx) => ({
      userId: voter.id,
      userName: voter.name,
      userRole: voter.role,
      userInitials: voter.initials,
      avatarColor: voter.avatarColor,
      votedAt: idx === 0 ? rawIssue.reportedAt : rawIssue.updatedAt,
      note: idx === 0 ? "Filed initial on-site complaint." : noteList[idx - 1],
    }));
  }

  const normalizedHistory: IssueEvent[] = rawIssue.history.map((event) => {
    const evStatus = normalizeIssueStatus(event.status) ?? status;
    if (event.actorName) return { ...event, status: evStatus };
    const assigned =
      event.actor === "citizen"
        ? sectorCitizen
        : event.actor === "municipal-desk"
          ? verifierUser
          : event.actor === "field-team"
            ? deptOfficial
            : null;
    if (!assigned) return { ...event, status: evStatus };
    return {
      ...event,
      status: evStatus,
      actorName: assigned.name,
      actorUserId: assigned.id,
      actorRole: assigned.role,
      actorInitials: assigned.initials,
      actorAvatarColor: assigned.avatarColor,
    };
  });

  // Base enrichment common to all records
  let enriched: Issue = {
    ...rawIssue,
    status,
    departmentId: rawIssue.departmentId ?? dept.id,
    version: rawIssue.version ?? 1,
    reportedBy: reporter,
    votes,
    history: normalizedHistory,
    ...(status === "resolved" && !rawIssue.resolutionVerification
      ? { resolutionVerification: "legacy_unverified" }
      : {}),
  };

  // Apply realistic V2 evaluator scenarios ONLY on clean un-overridden seeded records
  // (detected when accountabilityTimeline has not yet been recorded dynamically).
  if (!rawIssue.accountabilityTimeline) {
    if (rawIssue.id === "ISS-012") {
      // Scenario: Active repair linked to project (Due Soon — 2 days left from DEMO_NOW 2025-07-22)
      enriched = {
        ...enriched,
        assignedTeam: "Carriageway Patching Crew B",
        workOrderRef: "WO-2025-0712",
        estimatedRepairDate: "2025-07-24",
        officialResponse: {
          message:
            "Asphalt milling and base compaction crew dispatched alongside water pipeline backfill.",
          respondedBy: toUserRef(officialRoads),
          respondedAt: "2025-07-16",
          departmentId: "DEPT-ROADS",
          assignedTeam: "Carriageway Patching Crew B",
          workOrderRef: "WO-2025-0712",
        },
        deadlineHistory: [
          {
            id: "DL-012-1",
            newDate: "2025-07-24",
            reason: "Initial SLA target set for joint trench compaction.",
            changedBy: toUserRef(officialRoads),
            changedAt: "2025-07-16",
            breachedPriorDeadline: false,
          },
        ],
      };
    } else if (rawIssue.id === "ISS-006") {
      // Scenario: Overdue repair with deadline extensions & historical SLA breach
      enriched = {
        ...enriched,
        assignedTeam: "North Gate Waste Transfer Unit",
        workOrderRef: "WO-2025-0602",
        estimatedRepairDate: "2025-07-10",
        slaBreachedAt: "2025-06-28",
        officialResponse: {
          message:
            "Boundary wall rebuild and bay drainage apron scheduled prior to peak monsoon.",
          respondedBy: toUserRef(deptOfficial),
          respondedAt: "2025-04-22",
          departmentId: dept.id,
          assignedTeam: "North Gate Waste Transfer Unit",
          workOrderRef: "WO-2025-0602",
        },
        deadlineHistory: [
          {
            id: "DL-006-1",
            previousDate: "2025-05-30",
            newDate: "2025-06-27",
            reason: "Delayed concrete footing cure during early rain.",
            changedBy: toUserRef(deptOfficial),
            changedAt: "2025-05-28",
            breachedPriorDeadline: false,
          },
          {
            id: "DL-006-2",
            previousDate: "2025-06-27",
            newDate: "2025-07-10",
            reason: "Contractor remobilized after haulage bay stoppage.",
            changedBy: toUserRef(deptOfficial),
            changedAt: "2025-06-29",
            breachedPriorDeadline: true,
          },
        ],
      };
    } else if (rawIssue.id === "ISS-016") {
      // Scenario: Repair submitted -> Awaiting Independent Verification (delayed > 3d)
      enriched = {
        ...enriched,
        status: "awaiting_verification",
        updatedAt: "2025-07-17",
        assignedTeam: "Feeder Pole & Harness Team",
        workOrderRef: "WO-2025-0715",
        estimatedRepairDate: "2025-07-20",
        evidenceIds: [...enriched.evidenceIds, "EV-ISS-L09-R1"],
        officialResponse: {
          message:
            "Replaced weathered overhead splice box with IP66 weatherproof enclosure.",
          respondedBy: toUserRef(officialRoads),
          respondedAt: "2025-07-14",
          departmentId: dept.id,
          assignedTeam: "Feeder Pole & Harness Team",
          workOrderRef: "WO-2025-0715",
        },
        repairAttempts: [
          {
            id: "RA-016-1",
            attemptNumber: 1,
            submittedBy: toUserRef(officialRoads),
            submittedAt: "2025-07-17",
            completionDate: "2025-07-17",
            resolutionNotes:
              "All six feeder spans re-terminated with waterproof junction boxes and tested at dusk.",
            workOrderRef: "WO-2025-0715",
            evidenceIds: ["EV-ISS-L09-R1"],
          },
        ],
        history: [
          ...normalizedHistory,
          {
            id: "ISS-016-H4",
            at: "2025-07-17",
            status: "awaiting_verification",
            note: "Field repair completed under WO-2025-0715 and submitted for independent verification.",
            actor: "field-team",
            actorName: officialRoads.name,
            actorUserId: officialRoads.id,
            actorRole: officialRoads.role,
            actorInitials: officialRoads.initials,
            actorAvatarColor: officialRoads.avatarColor,
          },
        ],
      };
    } else if (rawIssue.id === "ISS-010") {
      // Scenario: Successfully independently verified resolution (resolved within deadline)
      enriched = {
        ...enriched,
        resolutionVerification: "verified",
        assignedTeam: "East Corridor LED Commissioning Crew",
        workOrderRef: "WO-2025-0211",
        estimatedRepairDate: "2025-02-22",
        officialResponse: {
          message:
            "LED driver swap and independent nighttime lux survey scheduled on Ward 11 corridor.",
          respondedBy: toUserRef(officialRoads),
          respondedAt: "2025-02-11",
          departmentId: dept.id,
          assignedTeam: "East Corridor LED Commissioning Crew",
          workOrderRef: "WO-2025-0211",
        },
        repairAttempts: [
          {
            id: "RA-010-1",
            attemptNumber: 1,
            submittedBy: toUserRef(officialRoads),
            submittedAt: "2025-02-18",
            completionDate: "2025-02-18",
            resolutionNotes:
              "All four luminaire drivers replaced; sustained 24 lux across pedestrian crossing.",
            workOrderRef: "WO-2025-0211",
            evidenceIds: ["EV-ISS-EB-01"],
            verification: {
              decision: "approved",
              verifiedBy: toUserRef(verifierUser),
              verifiedAt: "2025-02-19",
              notes:
                "Independent night inspection verified >22 lux uniformity across all four poles.",
              evidenceIds: ["EV-ISS-EB-01"],
            },
          },
        ],
      };
    } else if (rawIssue.id === "ISS-003") {
      // Scenario: Rejected repair with preserved repair history & failed verification finding
      enriched = {
        ...enriched,
        departmentId: "DEPT-ROADS",
        assignedTeam: "Arterial Resurfacing Unit",
        workOrderRef: "WO-2025-0311",
        estimatedRepairDate: "2025-07-09",
        slaBreachedAt: "2025-07-10",
        evidenceIds: [...enriched.evidenceIds, "EV-PR01-01", "EV-PR01-02"],
        officialResponse: {
          message:
            "Emergency pumping crew cleared standing floodwater after third re-carpeting work order.",
          respondedBy: toUserRef(officialRoads),
          respondedAt: "2025-07-06",
          departmentId: "DEPT-ROADS",
          assignedTeam: "Arterial Resurfacing Unit",
          workOrderRef: "WO-2025-0311",
        },
        repairAttempts: [
          {
            id: "RA-003-1",
            attemptNumber: 1,
            submittedBy: toUserRef(officialRoads),
            submittedAt: "2025-07-11",
            completionDate: "2025-07-11",
            resolutionNotes:
              "Pumped junction surface and sealed visible cracks under WO-2025-0311.",
            workOrderRef: "WO-2025-0311",
            evidenceIds: ["EV-PR01-01"],
            verification: {
              decision: "rejected",
              verifiedBy: toUserRef(verifierUser),
              verifiedAt: "2025-07-14",
              notes:
                "Rejected after field check: catch-pit inlets remain absent and flagged core samples fail depth spec.",
              evidenceIds: ["EV-PR01-02", "EV-ISS-BRS-03"],
            },
          },
        ],
      };
    } else if (rawIssue.id === "ISS-011") {
      // Scenario: Resolved legacy issue with pending citizen Recurrence Request
      const pendingRequest: RecurrenceRequest = {
        id: "REC-011-1",
        requestedBy: toUserRef(citizenPool[0]),
        requestedAt: "2025-07-20",
        reason:
          "Thermoplastic zebra stripes faded again within five months near the school gate after monsoon runoff.",
        evidenceIds: [],
        status: "pending",
      };
      enriched = {
        ...enriched,
        resolutionVerification: "legacy_unverified",
        recurrenceRequests: [pendingRequest],
      };
    }
  }

  const timeline: AccountabilityEvent[] =
    enriched.accountabilityTimeline ??
    enriched.history.map((event) =>
      actorEventFromHistory(event, enriched, sectorCitizen, verifierUser, deptOfficial)
    );

  return {
    ...enriched,
    accountabilityTimeline: timeline,
  };
}

/* ------------------------------------------------------------------ */
/* Public Reads                                                        */
/* ------------------------------------------------------------------ */

export function listIssues(): Issue[] {
  const store = readStore();
  const merged = ISSUES.map((issue) => store.overrides[issue.id] ?? issue);
  return [...merged, ...store.created].map(enrichIssueV2);
}

export function findIssue(id: string): Issue | undefined {
  return listIssues().find((issue) => issue.id === id);
}

export function listAllEvidence(): Evidence[] {
  const store = readStore();
  const issues = listIssues();
  const combined = [...EVIDENCE, ...SYNTHETIC_REPAIR_EVIDENCE, ...store.evidence];
  return combined.map((item) =>
    enrichEvidenceV2(store.evidenceOverrides[item.id] ?? item, issues)
  );
}

export function findRuntimeEvidence(id: string): Evidence | undefined {
  return listAllEvidence().find((item) => item.id === id);
}

export function listRuntimeEvidence(): Evidence[] {
  return readStore().evidence;
}

export function issuesAtLocation(locationKey: string): Issue[] {
  return listIssues()
    .filter((issue) => issue.locationKey === locationKey)
    .sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
}

export function nextIssueId(): string {
  const all = listIssues();
  const used = new Set(all.map((issue) => issue.id));
  let index = all.length + 1;
  while (used.has(`ISS-${String(index).padStart(3, "0")}`)) index += 1;
  return `ISS-${String(index).padStart(3, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Persistence helpers                                                 */
/* ------------------------------------------------------------------ */

function saveUpdatedIssue(updated: Issue): void {
  const store = readStore();
  const createdIndex = store.created.findIndex((item) => item.id === updated.id);
  if (createdIndex >= 0) {
    store.created[createdIndex] = updated;
  } else {
    store.overrides[updated.id] = updated;
  }
  writeStore(store);
}

function makeAccountabilityEvent(
  issue: Issue,
  user: PublicUser,
  type: AccountabilityEvent["type"],
  description: string,
  extra?: Pick<
    AccountabilityEvent,
    "previousValue" | "newValue" | "evidenceIds" | "projectId" | "workOrderRef"
  >
): AccountabilityEvent {
  const count = (issue.accountabilityTimeline?.length ?? 0) + 1;
  return {
    id: `AE-${issue.id}-${Date.now()}-${count}`,
    type,
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    actorInitials: user.initials,
    actorAvatarColor: user.avatarColor,
    timestamp: DEMO_NOW,
    description,
    ...extra,
  };
}

function makeHistoryEvent(
  issue: Issue,
  user: PublicUser,
  status: IssueStatus,
  note: string
): IssueEvent {
  const actor: IssueActor =
    user.role === "official"
      ? "field-team"
      : user.role === "verifier"
        ? "municipal-desk"
        : "citizen";
  return {
    id: `${issue.id}-H${issue.history.length + 1}`,
    at: DEMO_NOW,
    status,
    note,
    actor,
    actorName: user.name,
    actorUserId: user.id,
    actorRole: user.role,
    actorInitials: user.initials,
    actorAvatarColor: user.avatarColor,
  };
}

export interface MutationError {
  ok: false;
  status: number;
  error: string;
}

export interface IssueMutationSuccess {
  ok: true;
  issue: Issue;
}

function checkVersion(issue: Issue, expectedVersion?: number): MutationError | null {
  if (
    typeof expectedVersion === "number" &&
    issue.version !== undefined &&
    expectedVersion !== issue.version
  ) {
    return {
      ok: false,
      status: 409,
      error: "This record was updated by another user. Refresh and try again.",
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Write Actions (Permissions + State Machine + Timeline + Notifs)     */
/* ------------------------------------------------------------------ */

export function slugifyLocation(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const CORRIDOR_PATTERNS: { locationKey: string; terms: string[] }[] = [
  {
    locationKey: "begum-rokeya-sarani-junction",
    terms: ["begum rokeya", "rokeya sarani", "link road"],
  },
  {
    locationKey: "west-canal-outfall",
    terms: ["canal outfall", "canal west blocks", "western storm canal"],
  },
  { locationKey: "north-gate-market-lane", terms: ["market lane"] },
  { locationKey: "canal-road-trench", terms: ["canal road"] },
  { locationKey: "civic-core-junction", terms: ["civic core"] },
  { locationKey: "east-boulevard-school-zone", terms: ["civic boulevard", "school"] },
  { locationKey: "south-market-crossing", terms: ["bus interchange", "crossing"] },
  { locationKey: "south-market-lane-4", terms: ["lane 4", "south outfall"] },
  { locationKey: "north-gate-feeder", terms: ["feeder"] },
];

function resolveLocationMatch(
  location: string,
  sectorId: string,
  explicitKey?: string
): {
  locationKey: string;
  projectId?: string;
  reopensIssueId?: string;
  baseCoordinates?: MapPosition;
} | null {
  const all = listIssues();
  const knownKeys = new Set<string>([
    ...PROJECTS.map((project) => project.locationKey),
    ...all.map((issue) => issue.locationKey),
  ]);

  let matchedKey: string | undefined;
  const trimmedExplicit = explicitKey?.trim();
  if (trimmedExplicit && knownKeys.has(trimmedExplicit)) {
    matchedKey = trimmedExplicit;
  } else {
    const normalized = location.toLowerCase();
    const pattern = CORRIDOR_PATTERNS.find((entry) =>
      entry.terms.some((term) => normalized.includes(term))
    );
    if (pattern) matchedKey = pattern.locationKey;
  }

  if (!matchedKey) return null;

  const matchedProject =
    PROJECTS.find(
      (project) => project.locationKey === matchedKey && project.sectorId === sectorId
    ) ?? PROJECTS.find((project) => project.locationKey === matchedKey);
  const matchingIssues = all
    .filter((issue) => issue.locationKey === matchedKey)
    .sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
  const resolvedPrior = matchingIssues.find((issue) => issue.status === "resolved");

  return {
    locationKey: matchedKey,
    projectId: matchedProject?.id ?? matchingIssues.find((issue) => issue.projectId)?.projectId,
    reopensIssueId: resolvedPrior?.id,
    baseCoordinates:
      matchedProject?.coordinates ??
      matchingIssues[matchingIssues.length - 1]?.coordinates,
  };
}

function positionFor(
  sectorId: string,
  seed: string,
  baseCoordinates?: MapPosition
): MapPosition {
  const sector = SECTORS.find((item) => item.id === sectorId) ?? SECTORS[0];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  if (baseCoordinates) {
    const offsetX = ((hash % 15) - 7) / 20;
    const offsetZ = ((Math.floor(hash / 15) % 15) - 7) / 20;
    return [
      Number((baseCoordinates[0] + offsetX).toFixed(2)),
      Number((baseCoordinates[1] + offsetZ).toFixed(2)),
    ];
  }
  const offsetX = ((hash % 21) - 10) / 12;
  const offsetZ = ((Math.floor(hash / 21) % 21) - 10) / 12;
  return [
    Number((sector.center[0] + offsetX).toFixed(2)),
    Number((sector.center[1] + offsetZ).toFixed(2)),
  ];
}

export interface CreateIssueInput {
  title: string;
  category: IssueCategory;
  description: string;
  location: string;
  sectorId: string;
  locationKey?: string;
  coordinates?: MapPosition;
  photoDataUrl?: string;
}

export function createIssue(input: CreateIssueInput, author: PublicUser): Issue {
  const store = readStore();
  const id = nextIssueId();
  const code = `CT-ISS-${id.split("-")[1]}`;
  const today = DEMO_NOW;
  const match = resolveLocationMatch(input.location, input.sectorId, input.locationKey);
  const dept = getDepartmentForIssue({ category: input.category });

  const evidence: Evidence[] = [];
  if (input.photoDataUrl) {
    evidence.push({
      id: `EV-${id}-1`,
      kind: "photo",
      title: "Citizen photograph",
      capturedAt: today,
      uploadedAt: today,
      uploadedBy: toUserRef(author),
      category: "citizen_report",
      status: "unverified",
      issueId: id,
      ...(match?.projectId ? { projectId: match.projectId } : {}),
      source: `${author.name} (${author.role})`,
      verified: false,
      description: `Photograph attached to the report by ${author.name}. Not yet reviewed by a Civic Verifier.`,
      dataUrl: input.photoDataUrl,
      verificationHistory: [],
    });
  }

  const resolvedCoordinates: MapPosition = input.coordinates
    ? [
        Number(input.coordinates[0].toFixed(2)),
        Number(input.coordinates[1].toFixed(2)),
      ]
    : positionFor(input.sectorId, id, match?.baseCoordinates);

  const actorKind: IssueActor =
    author.role === "verifier" ? "municipal-desk" : "citizen";

  const baseEvent: IssueEvent = {
    id: `${id}-H1`,
    at: today,
    status: "reported",
    note: `Filed by ${author.name} through the CityTrace civic register.`,
    actor: actorKind,
    actorName: author.name,
    actorUserId: author.id,
    actorRole: author.role,
    actorInitials: author.initials,
    actorAvatarColor: author.avatarColor,
  };

  const timeline: AccountabilityEvent[] = [
    {
      id: `AE-${id}-1`,
      type: "issue_created",
      actorId: author.id,
      actorName: author.name,
      actorRole: author.role,
      actorInitials: author.initials,
      actorAvatarColor: author.avatarColor,
      timestamp: today,
      description: `Reported "${input.title}" at ${input.location}. Assigned to ${dept.shortName} intake queue.`,
      newValue: "Reported",
      ...(match?.projectId ? { projectId: match.projectId } : {}),
    },
  ];

  if (evidence.length > 0) {
    timeline.push({
      id: `AE-${id}-2`,
      type: "evidence_submitted",
      actorId: author.id,
      actorName: author.name,
      actorRole: author.role,
      actorInitials: author.initials,
      actorAvatarColor: author.avatarColor,
      timestamp: today,
      description: `Attached photographic evidence (${evidence[0].id}) awaiting verification.`,
      evidenceIds: [evidence[0].id],
    });
  }

  const issue: Issue = {
    id,
    code,
    version: 1,
    title: input.title,
    category: input.category,
    description: input.description,
    sectorId: input.sectorId,
    departmentId: dept.id,
    location: input.location,
    locationKey: match?.locationKey ?? (slugifyLocation(input.location) || slugifyLocation(id)),
    coordinates: resolvedCoordinates,
    status: "reported",
    severity: "moderate",
    reportedAt: today,
    updatedAt: today,
    reportCount: 1,
    ...(match?.reopensIssueId ? { reopensIssueId: match.reopensIssueId } : {}),
    ...(match?.projectId ? { projectId: match.projectId } : {}),
    evidenceIds: evidence.map((item) => item.id),
    reportedBy: toUserRef(author),
    votes: [
      {
        userId: author.id,
        userName: author.name,
        userRole: author.role,
        userInitials: author.initials,
        avatarColor: author.avatarColor,
        votedAt: today,
        note: "Filed the initial civic complaint.",
      },
    ],
    history: [baseEvent],
    accountabilityTimeline: timeline,
  };

  store.created.push(issue);
  store.evidence.push(...evidence);
  writeStore(store);

  dispatchAccountabilityNotifications({
    dedupeKey: `issue_created:${issue.id}`,
    category: "new_issue",
    title: `New report ${issue.code} in ${issue.sectorId}`,
    message: `${author.name} reported "${issue.title}" (${dept.shortName}).`,
    href: `/civic-issues/${issue.id}`,
    issueId: issue.id,
    sectorId: issue.sectorId,
    projectId: issue.projectId,
    departmentId: dept.id,
    targetRoles: ["verifier"],
    excludeUserId: author.id,
  });

  return issue;
}

export function confirmIssue(
  id: string,
  user: PublicUser,
  note?: string
): { issue: Issue; alreadyVoted: boolean; forbidden?: string } | null {
  const base = findIssue(id);
  if (!base) return null;

  const perm = canUserPerform(user, "vote_issue", { issue: base });
  if (!perm.allowed) {
    return { issue: base, alreadyVoted: false, forbidden: perm.reason };
  }

  const existingVotes = base.votes ?? [];
  if (existingVotes.some((vote) => vote.userId === user.id)) {
    return { issue: base, alreadyVoted: true };
  }

  const today = DEMO_NOW;
  const trimmedNote = note?.trim();
  const vote: IssueVote = {
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    userInitials: user.initials,
    avatarColor: user.avatarColor,
    votedAt: today,
    ...(trimmedNote ? { note: trimmedNote } : {}),
  };

  const event = makeHistoryEvent(
    base,
    user,
    base.status,
    trimmedNote || `${user.name} confirmed this issue is still present on site.`
  );

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    reportCount: base.reportCount + 1,
    updatedAt: today,
    votes: [...existingVotes, vote],
    history: [...base.history, event],
  };

  saveUpdatedIssue(updated);
  return { issue: updated, alreadyVoted: false };
}

export function unconfirmIssue(id: string, user: PublicUser): Issue | null {
  const base = findIssue(id);
  if (!base) return null;

  const existingVotes = base.votes ?? [];
  if (!existingVotes.some((vote) => vote.userId === user.id)) {
    return base;
  }

  const nextVotes = existingVotes.filter((vote) => vote.userId !== user.id);
  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    reportCount: Math.max(1, base.reportCount - 1),
    updatedAt: DEMO_NOW,
    votes: nextVotes,
  };

  saveUpdatedIssue(updated);
  return updated;
}

/** Reported -> Under Review (Verifier only). */
export function reviewIssue(
  id: string,
  user: PublicUser,
  note?: string,
  expectedVersion?: number
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, expectedVersion);
  if (stale) return stale;

  const perm = canUserPerform(user, "review_issue", { issue: base });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  if (!isValidTransition(base.status, "under_review")) {
    return {
      ok: false,
      status: 422,
      error: `Cannot transition from ${base.status} to under_review.`,
    };
  }

  const trimmedNote =
    note?.trim() || "Civic Verifier reviewed initial report and forwarded to responsible department.";
  const timelineEvent = makeAccountabilityEvent(
    base,
    user,
    "status_changed",
    trimmedNote,
    {
      previousValue: ISSUE_STATUS_LABELS[base.status],
      newValue: ISSUE_STATUS_LABELS.under_review,
    }
  );

  const dept = getDepartmentForIssue(base);
  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    status: "under_review",
    departmentId: base.departmentId ?? dept.id,
    updatedAt: DEMO_NOW,
    history: [...base.history, makeHistoryEvent(base, user, "under_review", trimmedNote)],
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), timelineEvent],
  };

  saveUpdatedIssue(updated);
  dispatchAccountabilityNotifications({
    dedupeKey: `review:${updated.id}:${updated.version}`,
    category: "status_update",
    title: `${updated.code} moved to Under Review`,
    message: `${user.name} verified intake for "${updated.title}". Assigned to ${dept.shortName}.`,
    href: `/civic-issues/${updated.id}`,
    issueId: updated.id,
    sectorId: updated.sectorId,
    projectId: updated.projectId,
    departmentId: updated.departmentId,
    targetRoles: ["official"],
    excludeUserId: user.id,
  });

  return { ok: true, issue: updated };
}

/** Under Review | Reopened -> In Progress (Authorized Department Official). */
export function startOfficialRepair(
  id: string,
  user: PublicUser,
  payload: {
    departmentId: string;
    assignedTeam?: string;
    officialResponse: string;
    workOrderRef?: string;
    projectId?: string;
    estimatedRepairDate: string;
    expectedVersion?: number;
  }
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, payload.expectedVersion);
  if (stale) return stale;

  const dept = getDepartment(payload.departmentId) ?? getDepartmentForIssue(base);
  const perm = canUserPerform(user, "start_repair", {
    issue: base,
    targetDepartmentId: dept.id,
  });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  if (!isValidTransition(base.status, "in_progress")) {
    return {
      ok: false,
      status: 422,
      error: `Cannot transition from ${base.status} to in_progress.`,
    };
  }

  const responseText = payload.officialResponse.trim();
  if (responseText.length < 10) {
    return {
      ok: false,
      status: 422,
      error: "Official response must explain the planned action (at least 10 characters).",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.estimatedRepairDate)) {
    return { ok: false, status: 422, error: "Provide a valid estimated repair date." };
  }
  if (
    payload.projectId &&
    !PROJECTS.some((project) => project.id === payload.projectId)
  ) {
    return { ok: false, status: 422, error: "Selected project reference does not exist." };
  }

  const workOrderRef = payload.workOrderRef?.trim() || undefined;
  const assignedTeam = payload.assignedTeam?.trim() || undefined;
  const projectId = payload.projectId?.trim() || base.projectId;
  const userRef = toUserRef(user);
  const priorDate = base.estimatedRepairDate;
  const wasBreached = Boolean(base.slaBreachedAt);

  const deadlineEntry = {
    id: `DL-${base.id}-${(base.deadlineHistory?.length ?? 0) + 1}`,
    ...(priorDate ? { previousDate: priorDate } : {}),
    newDate: payload.estimatedRepairDate,
    reason: priorDate
      ? `Updated SLA target upon repair mobilization: ${responseText.slice(0, 80)}`
      : "Initial official repair SLA deadline established.",
    changedBy: userRef,
    changedAt: DEMO_NOW,
    breachedPriorDeadline: wasBreached,
  };

  const newEvents: AccountabilityEvent[] = [
    makeAccountabilityEvent(
      base,
      user,
      "official_response",
      responseText,
      {
        previousValue: ISSUE_STATUS_LABELS[base.status],
        newValue: ISSUE_STATUS_LABELS.in_progress,
        ...(projectId ? { projectId } : {}),
        ...(workOrderRef ? { workOrderRef } : {}),
      }
    ),
    makeAccountabilityEvent(
      base,
      user,
      priorDate ? "deadline_changed" : "deadline_set",
      `Estimated repair completion set to ${payload.estimatedRepairDate}${
        workOrderRef ? ` (${workOrderRef})` : ""
      }.`,
      {
        ...(priorDate ? { previousValue: priorDate } : {}),
        newValue: payload.estimatedRepairDate,
        ...(workOrderRef ? { workOrderRef } : {}),
      }
    ),
  ];

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    status: "in_progress",
    departmentId: dept.id,
    assignedTeam,
    workOrderRef: workOrderRef ?? base.workOrderRef,
    projectId,
    estimatedRepairDate: payload.estimatedRepairDate,
    officialResponse: {
      message: responseText,
      respondedBy: userRef,
      respondedAt: DEMO_NOW,
      departmentId: dept.id,
      assignedTeam,
      workOrderRef,
    },
    deadlineHistory: [...(base.deadlineHistory ?? []), deadlineEntry],
    updatedAt: DEMO_NOW,
    history: [
      ...base.history,
      makeHistoryEvent(
        base,
        user,
        "in_progress",
        `${dept.shortName} started repair (target ${payload.estimatedRepairDate})${
          workOrderRef ? ` · ${workOrderRef}` : ""
        }: ${responseText}`
      ),
    ],
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), ...newEvents],
  };

  saveUpdatedIssue(updated);
  dispatchAccountabilityNotifications({
    dedupeKey: `official_response:${updated.id}:${updated.version}`,
    category: "official_response",
    title: `Official response posted on ${updated.code}`,
    message: `${user.name} (${dept.shortName}) mobilized repair targeting ${payload.estimatedRepairDate}.`,
    href: `/civic-issues/${updated.id}`,
    issueId: updated.id,
    sectorId: updated.sectorId,
    projectId: updated.projectId,
    departmentId: updated.departmentId,
    excludeUserId: user.id,
  });

  return { ok: true, issue: updated };
}

/** Update repair deadline with mandatory reason while preserving historical SLA breaches. */
export function extendIssueDeadline(
  id: string,
  user: PublicUser,
  payload: {
    newDate: string;
    reason: string;
    expectedVersion?: number;
  }
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, payload.expectedVersion);
  if (stale) return stale;

  const perm = canUserPerform(user, "update_deadline", { issue: base });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.newDate)) {
    return { ok: false, status: 422, error: "Provide a valid YYYY-MM-DD deadline." };
  }
  const reason = payload.reason.trim();
  if (reason.length < 8) {
    return {
      ok: false,
      status: 422,
      error: "A clear reason (at least 8 characters) is required to extend a deadline.",
    };
  }

  const prev = base.estimatedRepairDate;
  const breachedPrior = Boolean(
    base.slaBreachedAt || (prev && prev < DEMO_NOW)
  );

  const deadlineChange = {
    id: `DL-${base.id}-${(base.deadlineHistory?.length ?? 0) + 1}`,
    ...(prev ? { previousDate: prev } : {}),
    newDate: payload.newDate,
    reason,
    changedBy: toUserRef(user),
    changedAt: DEMO_NOW,
    breachedPriorDeadline: breachedPrior,
  };

  const timelineEvent = makeAccountabilityEvent(
    base,
    user,
    "deadline_changed",
    `Deadline revised to ${payload.newDate}: ${reason}`,
    {
      ...(prev ? { previousValue: prev } : {}),
      newValue: payload.newDate,
    }
  );

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    estimatedRepairDate: payload.newDate,
    slaBreachedAt: base.slaBreachedAt ?? (breachedPrior ? prev : undefined),
    deadlineHistory: [...(base.deadlineHistory ?? []), deadlineChange],
    updatedAt: DEMO_NOW,
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), timelineEvent],
  };

  saveUpdatedIssue(updated);
  dispatchAccountabilityNotifications({
    dedupeKey: `deadline_change:${updated.id}:${updated.version}`,
    category: "deadline_change",
    title: `Repair deadline revised on ${updated.code}`,
    message: `Target moved ${prev ?? "unscheduled"} → ${payload.newDate}. Reason: ${reason}`,
    href: `/civic-issues/${updated.id}`,
    issueId: updated.id,
    sectorId: updated.sectorId,
    projectId: updated.projectId,
    excludeUserId: user.id,
  });

  return { ok: true, issue: updated };
}

/** In Progress -> Awaiting Verification (Official submits completed repair + mandatory evidence). */
export function submitRepairCompletion(
  id: string,
  user: PublicUser,
  payload: {
    resolutionNotes: string;
    completionDate: string;
    workOrderRef?: string;
    evidenceTitle: string;
    evidenceDescription?: string;
    photoDataUrl?: string;
    expectedVersion?: number;
  }
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, payload.expectedVersion);
  if (stale) return stale;

  const perm = canUserPerform(user, "submit_repair", { issue: base });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  if (!isValidTransition(base.status, "awaiting_verification")) {
    return {
      ok: false,
      status: 422,
      error: `Cannot submit repair from status ${base.status}.`,
    };
  }

  const notes = payload.resolutionNotes.trim();
  const evidenceTitle = payload.evidenceTitle.trim();
  if (notes.length < 10) {
    return {
      ok: false,
      status: 422,
      error: "Resolution notes (at least 10 characters) are mandatory.",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.completionDate)) {
    return { ok: false, status: 422, error: "Provide a valid completion date." };
  }
  if (evidenceTitle.length < 4) {
    return {
      ok: false,
      status: 422,
      error: "Supporting repair evidence title is required before submitting for verification.",
    };
  }

  const store = readStore();
  const dept = getDepartmentForIssue(base);
  const workOrderRef = payload.workOrderRef?.trim() || base.workOrderRef;
  const attemptNumber = (base.repairAttempts?.length ?? 0) + 1;
  const evidenceId = `EV-${base.id}-R${attemptNumber}-${Date.now().toString(36).slice(-4)}`;

  const repairEvidence: Evidence = {
    id: evidenceId,
    kind: payload.photoDataUrl ? "photo" : "document",
    title: evidenceTitle,
    capturedAt: payload.completionDate,
    uploadedAt: DEMO_NOW,
    uploadedBy: toUserRef(user),
    category: "official_repair",
    status: "unverified",
    issueId: base.id,
    ...(base.projectId ? { projectId: base.projectId } : {}),
    source: `${user.name} (${dept.shortName})`,
    verified: false,
    description:
      payload.evidenceDescription?.trim() ||
      `Official repair evidence submitted with Attempt #${attemptNumber}: ${notes}`,
    ...(workOrderRef ? { ref: workOrderRef } : {}),
    ...(payload.photoDataUrl ? { dataUrl: payload.photoDataUrl } : {}),
    verificationHistory: [],
  };

  const attempt: RepairAttempt = {
    id: `RA-${base.id}-${attemptNumber}`,
    attemptNumber,
    submittedBy: toUserRef(user),
    submittedAt: DEMO_NOW,
    completionDate: payload.completionDate,
    resolutionNotes: notes,
    ...(workOrderRef ? { workOrderRef } : {}),
    evidenceIds: [evidenceId],
  };

  const timelineEvent = makeAccountabilityEvent(
    base,
    user,
    "repair_submitted",
    `Submitted Repair Attempt #${attemptNumber} (${payload.completionDate}): ${notes}`,
    {
      previousValue: ISSUE_STATUS_LABELS.in_progress,
      newValue: ISSUE_STATUS_LABELS.awaiting_verification,
      evidenceIds: [evidenceId],
      ...(workOrderRef ? { workOrderRef } : {}),
    }
  );

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    status: "awaiting_verification",
    workOrderRef,
    updatedAt: DEMO_NOW,
    evidenceIds: [...base.evidenceIds, evidenceId],
    repairAttempts: [...(base.repairAttempts ?? []), attempt],
    history: [
      ...base.history,
      makeHistoryEvent(
        base,
        user,
        "awaiting_verification",
        `Repair #${attemptNumber} submitted by ${user.name} for independent verification.`
      ),
    ],
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), timelineEvent],
  };

  store.evidence.push(repairEvidence);
  const createdIndex = store.created.findIndex((item) => item.id === updated.id);
  if (createdIndex >= 0) store.created[createdIndex] = updated;
  else store.overrides[updated.id] = updated;
  writeStore(store);

  dispatchAccountabilityNotifications({
    dedupeKey: `repair_submitted:${updated.id}:${attemptNumber}`,
    category: "repair_submitted",
    title: `${updated.code} awaiting independent verification`,
    message: `${user.name} completed repair attempt #${attemptNumber}. Independent Civic Verifier inspection needed.`,
    href: `/civic-issues/${updated.id}`,
    issueId: updated.id,
    sectorId: updated.sectorId,
    projectId: updated.projectId,
    targetRoles: ["verifier"],
    excludeUserId: user.id,
  });

  return { ok: true, issue: updated };
}

/** Awaiting Verification -> Resolved (Approved) or Reopened (Rejected) — Verifier only. */
export function inspectRepairSubmission(
  id: string,
  user: PublicUser,
  payload: {
    decision: "approved" | "rejected";
    notes: string;
    evidenceTitle?: string;
    photoDataUrl?: string;
    expectedVersion?: number;
  }
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, payload.expectedVersion);
  if (stale) return stale;

  const perm = canUserPerform(user, "inspect_repair", { issue: base });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  const targetStatus: IssueStatus =
    payload.decision === "approved" ? "resolved" : "reopened";
  if (!isValidTransition(base.status, targetStatus)) {
    return {
      ok: false,
      status: 422,
      error: `Cannot move ${base.status} to ${targetStatus}.`,
    };
  }

  const notes = payload.notes.trim();
  if (notes.length < 8) {
    return {
      ok: false,
      status: 422,
      error: "Inspection notes (at least 8 characters) are required.",
    };
  }

  const store = readStore();
  const attempts = [...(base.repairAttempts ?? [])];
  const latestIdx = attempts.length - 1;
  const inspectionEvId = `EV-${base.id}-V${attempts.length || 1}-${Date.now().toString(36).slice(-4)}`;

  const inspectionEvidence: Evidence = {
    id: inspectionEvId,
    kind: payload.photoDataUrl ? "photo" : "document",
    title:
      payload.evidenceTitle?.trim() ||
      (payload.decision === "approved"
        ? "Independent Repair Verification Sign-Off"
        : "Independent Field Rejection Report"),
    capturedAt: DEMO_NOW,
    uploadedAt: DEMO_NOW,
    uploadedBy: toUserRef(user),
    category: "independent_verification",
    status: "verified",
    issueId: base.id,
    ...(base.projectId ? { projectId: base.projectId } : {}),
    source: `${user.name} (Civic Verifier)`,
    verified: true,
    verifiedBy: toUserRef(user),
    verifiedAt: DEMO_NOW,
    verificationReason: notes,
    description: notes,
    ...(payload.photoDataUrl ? { dataUrl: payload.photoDataUrl } : {}),
    verificationHistory: [
      {
        id: `${inspectionEvId}-VH1`,
        action: "verified",
        actor: toUserRef(user),
        at: DEMO_NOW,
        reason: notes,
      },
    ],
  };

  if (latestIdx >= 0) {
    attempts[latestIdx] = {
      ...attempts[latestIdx],
      verification: {
        decision: payload.decision,
        verifiedBy: toUserRef(user),
        verifiedAt: DEMO_NOW,
        notes,
        evidenceIds: [inspectionEvId],
      },
    };
  }

  const timelineEvent = makeAccountabilityEvent(
    base,
    user,
    payload.decision === "approved" ? "repair_approved" : "repair_rejected",
    payload.decision === "approved"
      ? `Independent verification approved repair: ${notes}`
      : `Independent inspection rejected repair and reopened issue: ${notes}`,
    {
      previousValue: ISSUE_STATUS_LABELS.awaiting_verification,
      newValue: ISSUE_STATUS_LABELS[targetStatus],
      evidenceIds: [inspectionEvId],
    }
  );

  const missedDeadline = Boolean(
    base.slaBreachedAt ||
      (base.estimatedRepairDate && DEMO_NOW > base.estimatedRepairDate)
  );

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    status: targetStatus,
    updatedAt: DEMO_NOW,
    resolvedAt: payload.decision === "approved" ? DEMO_NOW : undefined,
    resolutionVerification:
      payload.decision === "approved" ? "verified" : base.resolutionVerification,
    slaBreachedAt:
      base.slaBreachedAt ?? (missedDeadline ? base.estimatedRepairDate : undefined),
    evidenceIds: [...base.evidenceIds, inspectionEvId],
    repairAttempts: attempts,
    history: [
      ...base.history,
      makeHistoryEvent(
        base,
        user,
        targetStatus,
        payload.decision === "approved"
          ? `Verified resolved by ${user.name}: ${notes}`
          : `Repair rejected by ${user.name} and reopened: ${notes}`
      ),
    ],
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), timelineEvent],
  };

  store.evidence.push(inspectionEvidence);
  const createdIndex = store.created.findIndex((item) => item.id === updated.id);
  if (createdIndex >= 0) store.created[createdIndex] = updated;
  else store.overrides[updated.id] = updated;
  writeStore(store);

  dispatchAccountabilityNotifications({
    dedupeKey: `inspection:${updated.id}:${updated.version}`,
    category:
      payload.decision === "approved" ? "verification_outcome" : "reopened_issue",
    title:
      payload.decision === "approved"
        ? `${updated.code} verified resolved`
        : `${updated.code} verification rejected — Reopened`,
    message: `${user.name} ${
      payload.decision === "approved" ? "certified the completed repair" : "rejected the repair submission"
    }: ${notes}`,
    href: `/civic-issues/${updated.id}`,
    issueId: updated.id,
    sectorId: updated.sectorId,
    projectId: updated.projectId,
    departmentId: updated.departmentId,
    targetRoles: ["official"],
    excludeUserId: user.id,
  });

  return { ok: true, issue: updated };
}

/** Citizen / Verifier submits recurrence request against a Resolved issue without mutating official status yet. */
export function submitRecurrenceRequest(
  id: string,
  user: PublicUser,
  payload: {
    reason: string;
    photoDataUrl?: string;
    expectedVersion?: number;
  }
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, payload.expectedVersion);
  if (stale) return stale;

  const perm = canUserPerform(user, "submit_recurrence", { issue: base });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  const reason = payload.reason.trim();
  if (reason.length < 10) {
    return {
      ok: false,
      status: 422,
      error: "Describe why the problem has returned (at least 10 characters).",
    };
  }

  const store = readStore();
  const evidenceIds: string[] = [];
  if (payload.photoDataUrl) {
    const evId = `EV-${base.id}-REC-${Date.now().toString(36).slice(-4)}`;
    store.evidence.push({
      id: evId,
      kind: "photo",
      title: "Recurrence report evidence",
      capturedAt: DEMO_NOW,
      uploadedAt: DEMO_NOW,
      uploadedBy: toUserRef(user),
      category: "citizen_report",
      status: "unverified",
      issueId: base.id,
      ...(base.projectId ? { projectId: base.projectId } : {}),
      source: `${user.name} (${user.role})`,
      verified: false,
      description: `Submitted alongside recurrence request: ${reason}`,
      dataUrl: payload.photoDataUrl,
      verificationHistory: [],
    });
    evidenceIds.push(evId);
  }

  const req: RecurrenceRequest = {
    id: `REC-${base.id}-${(base.recurrenceRequests?.length ?? 0) + 1}`,
    requestedBy: toUserRef(user),
    requestedAt: DEMO_NOW,
    reason,
    evidenceIds,
    status: "pending",
  };

  const timelineEvent = makeAccountabilityEvent(
    base,
    user,
    "recurrence_requested",
    `Recurrence report submitted pending independent verification: ${reason}`,
    ...(evidenceIds.length > 0 ? [{ evidenceIds }] : [])
  );

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    updatedAt: DEMO_NOW,
    evidenceIds: [...base.evidenceIds, ...evidenceIds],
    recurrenceRequests: [...(base.recurrenceRequests ?? []), req],
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), timelineEvent],
  };

  const createdIndex = store.created.findIndex((item) => item.id === updated.id);
  if (createdIndex >= 0) store.created[createdIndex] = updated;
  else store.overrides[updated.id] = updated;
  writeStore(store);

  dispatchAccountabilityNotifications({
    dedupeKey: `recurrence_req:${updated.id}:${req.id}`,
    category: "status_update",
    title: `Recurrence request filed on ${updated.code}`,
    message: `${user.name} reported problem recurrence on "${updated.title}". Civic Verifier review needed.`,
    href: `/civic-issues/${updated.id}`,
    issueId: updated.id,
    sectorId: updated.sectorId,
    projectId: updated.projectId,
    targetRoles: ["verifier"],
    excludeUserId: user.id,
  });

  return { ok: true, issue: updated };
}

/** Verifier approves (reopening issue) or rejects a pending recurrence request. */
export function reviewRecurrenceRequest(
  id: string,
  requestId: string,
  user: PublicUser,
  payload: {
    decision: "approved" | "rejected";
    reviewNotes: string;
    expectedVersion?: number;
  }
): IssueMutationSuccess | MutationError {
  const base = findIssue(id);
  if (!base) return { ok: false, status: 404, error: `Unknown issue "${id}".` };

  const stale = checkVersion(base, payload.expectedVersion);
  if (stale) return stale;

  const perm = canUserPerform(user, "review_recurrence", { issue: base });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  const requests = [...(base.recurrenceRequests ?? [])];
  const idx = requests.findIndex((r) => r.id === requestId && r.status === "pending");
  if (idx < 0) {
    return { ok: false, status: 404, error: "Pending recurrence request not found." };
  }

  const notes = payload.reviewNotes.trim();
  if (notes.length < 8) {
    return {
      ok: false,
      status: 422,
      error: "Review notes (at least 8 characters) are required.",
    };
  }

  requests[idx] = {
    ...requests[idx],
    status: payload.decision,
    reviewedBy: toUserRef(user),
    reviewedAt: DEMO_NOW,
    reviewNotes: notes,
  };

  const approved = payload.decision === "approved";
  const timelineEvent = makeAccountabilityEvent(
    base,
    user,
    approved ? "issue_reopened" : "status_changed",
    approved
      ? `Substantiated recurrence request approved — issue reopened: ${notes}`
      : `Recurrence request declined after inspection: ${notes}`,
    approved
      ? {
          previousValue: ISSUE_STATUS_LABELS.resolved,
          newValue: ISSUE_STATUS_LABELS.reopened,
        }
      : undefined
  );

  const updated: Issue = {
    ...base,
    version: (base.version ?? 1) + 1,
    status: approved ? "reopened" : base.status,
    resolvedAt: approved ? undefined : base.resolvedAt,
    updatedAt: DEMO_NOW,
    recurrenceRequests: requests,
    history: approved
      ? [
          ...base.history,
          makeHistoryEvent(
            base,
            user,
            "reopened",
            `Reopened by ${user.name} after substantiated recurrence report: ${notes}`
          ),
        ]
      : base.history,
    accountabilityTimeline: [...(base.accountabilityTimeline ?? []), timelineEvent],
  };

  saveUpdatedIssue(updated);

  if (approved) {
    dispatchAccountabilityNotifications({
      dedupeKey: `recurrence_reopened:${updated.id}:${requestId}`,
      category: "reopened_issue",
      title: `${updated.code} reopened after recurrence review`,
      message: `${user.name} substantiated recurrence and reopened the issue for department action.`,
      href: `/civic-issues/${updated.id}`,
      issueId: updated.id,
      sectorId: updated.sectorId,
      projectId: updated.projectId,
      departmentId: updated.departmentId,
      targetRoles: ["official"],
      explicitUserIds: [requests[idx].requestedBy.id],
      excludeUserId: user.id,
    });
  }

  return { ok: true, issue: updated };
}

/** Verifier verifies, flags, or revokes verification of an Evidence item (no self-verification!). */
export function moderateEvidence(
  evidenceId: string,
  user: PublicUser,
  payload: {
    action: "verified" | "flagged" | "revoked";
    reason: string;
  }
): { ok: true; evidence: Evidence } | MutationError {
  const existing = findRuntimeEvidence(evidenceId);
  if (!existing) {
    return { ok: false, status: 404, error: `Unknown evidence "${evidenceId}".` };
  }

  const permAction =
    payload.action === "verified"
      ? "verify_evidence"
      : payload.action === "flagged"
        ? "flag_evidence"
        : "revoke_evidence";

  const perm = canUserPerform(user, permAction, { evidence: existing });
  if (!perm.allowed) return { ok: false, status: 403, error: perm.reason ?? "Forbidden." };

  const reason = payload.reason.trim();
  if (reason.length < 5) {
    return {
      ok: false,
      status: 422,
      error: "A recorded verification or flagging reason (at least 5 characters) is mandatory.",
    };
  }

  const nextStatus: EvidenceVerificationStatus =
    payload.action === "verified"
      ? "verified"
      : payload.action === "flagged"
        ? "flagged"
        : "unverified";

  const event = {
    id: `${evidenceId}-VH-${(existing.verificationHistory?.length ?? 0) + 1}`,
    action: payload.action,
    actor: toUserRef(user),
    at: DEMO_NOW,
    reason,
  };

  const updatedEvidence: Evidence = {
    ...existing,
    status: nextStatus,
    verified: nextStatus === "verified",
    verifiedBy: nextStatus === "unverified" ? undefined : toUserRef(user),
    verifiedAt: nextStatus === "unverified" ? undefined : DEMO_NOW,
    verificationReason: reason,
    verificationHistory: [...(existing.verificationHistory ?? []), event],
  };

  const store = readStore();
  store.evidenceOverrides[evidenceId] = updatedEvidence;

  // Record in linked issue accountability timeline if attached to an issue
  const linkedIssue = listIssues().find((iss) => iss.evidenceIds.includes(evidenceId));
  if (linkedIssue) {
    const timelineEvent = makeAccountabilityEvent(
      linkedIssue,
      user,
      payload.action === "verified"
        ? "evidence_verified"
        : payload.action === "flagged"
          ? "evidence_flagged"
          : "evidence_revoked",
      `Evidence "${existing.title}" marked ${nextStatus}: ${reason}`,
      { evidenceIds: [evidenceId] }
    );
    const updatedIssue: Issue = {
      ...linkedIssue,
      version: (linkedIssue.version ?? 1) + 1,
      updatedAt: DEMO_NOW,
      accountabilityTimeline: [...(linkedIssue.accountabilityTimeline ?? []), timelineEvent],
    };
    const createdIndex = store.created.findIndex((item) => item.id === updatedIssue.id);
    if (createdIndex >= 0) store.created[createdIndex] = updatedIssue;
    else store.overrides[updatedIssue.id] = updatedIssue;
  }

  writeStore(store);
  return { ok: true, evidence: updatedEvidence };
}
