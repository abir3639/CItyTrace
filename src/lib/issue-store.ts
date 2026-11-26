import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EVIDENCE, ISSUES, PROJECTS, SECTORS } from "@/data";
import type {
  Evidence,
  Issue,
  IssueCategory,
  IssueEvent,
  IssueStatus,
  MapPosition,
} from "@/types/citytrace";
import { ISSUE_STATUS_ORDER } from "@/types/citytrace";
import { DEMO_NOW } from "./stats";

/**
 * Runtime issue store.
 *
 * The seeded dataset stays the source of truth, but citizen reports and status
 * changes are layered on top of it. Two things happen here:
 *
 *  1. On first read, persisted changes are replayed INTO the shared `ISSUES`
 *     array, so every module that already derives from it (statistics, the 3D
 *     map, the AI engine) sees exactly the same records without any of them
 *     needing to know this file exists.
 *  2. Every mutation is written to a JSON file in the OS temp directory, which
 *     survives reloads and dev recompiles without writing inside the watched
 *     project tree.
 *
 * Server-only — never import this from a client component.
 */

const STORE_FILE = path.join(os.tmpdir(), "citytrace-runtime-issues.json");

interface StoreShape {
  created: Issue[];
  overrides: Record<string, Issue>;
  evidence: Evidence[];
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
    };
  } catch {
    return { created: [], overrides: {}, evidence: [] };
  }
}

function writeStore(store: StoreShape): void {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/**
 * The live issue list: seeded records with any persisted status changes
 * applied, followed by everything citizens have filed since.
 *
 * The merge happens on every read because Next runs route handlers and page
 * rendering in separate module instances — an in-memory cache would go stale
 * the moment a report was submitted through the API.
 */
export function listIssues(): Issue[] {
  const store = readStore();
  const seeded = ISSUES.map((issue) => store.overrides[issue.id] ?? issue);
  return [...seeded, ...store.created];
}

export function findIssue(id: string): Issue | undefined {
  return listIssues().find((issue) => issue.id === id);
}

export function findRuntimeEvidence(id: string): Evidence | undefined {
  return readStore().evidence.find((item) => item.id === id);
}

export function listRuntimeEvidence(): Evidence[] {
  return readStore().evidence;
}

export function listAllEvidence(): Evidence[] {
  return [...EVIDENCE, ...readStore().evidence];
}

/** Every issue recorded at the same physical location, oldest first. */
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
/* Writes                                                              */
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
  {
    locationKey: "north-gate-market-lane",
    terms: ["market lane"],
  },
  {
    locationKey: "canal-road-trench",
    terms: ["canal road"],
  },
  {
    locationKey: "civic-core-junction",
    terms: ["civic core"],
  },
  {
    locationKey: "east-boulevard-school-zone",
    terms: ["civic boulevard", "school"],
  },
  {
    locationKey: "south-market-crossing",
    terms: ["bus interchange", "crossing"],
  },
  {
    locationKey: "south-market-lane-4",
    terms: ["lane 4", "south outfall"],
  },
  {
    locationKey: "north-gate-feeder",
    terms: ["feeder"],
  },
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
    if (pattern) {
      matchedKey = pattern.locationKey;
    }
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
    const offsetX = (((hash % 15) - 7) / 20);
    const offsetZ = (((Math.floor(hash / 15) % 15) - 7) / 20);
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

export function createIssue(input: CreateIssueInput): Issue {
  const store = readStore();

  const id = nextIssueId();
  const code = `CT-ISS-${id.split("-")[1]}`;
  // The dataset is a frozen snapshot, so new reports are dated to the snapshot
  // rather than the wall clock — otherwise they would sit outside the scenario.
  const today = DEMO_NOW;
  const match = resolveLocationMatch(input.location, input.sectorId, input.locationKey);

  const evidence: Evidence[] = [];
  if (input.photoDataUrl) {
    evidence.push({
      id: `EV-${id}-1`,
      kind: "photo",
      title: "Citizen photograph",
      capturedAt: today,
      source: "Citizen upload",
      verified: false,
      description:
        "Photograph attached to the report by the citizen. Not yet reviewed by a municipal verifier.",
      dataUrl: input.photoDataUrl,
    });
  }

  const resolvedCoordinates: MapPosition = input.coordinates
    ? [
        Number(input.coordinates[0].toFixed(2)),
        Number(input.coordinates[1].toFixed(2)),
      ]
    : positionFor(input.sectorId, id, match?.baseCoordinates);

  const issue: Issue = {
    id,
    code,
    title: input.title,
    category: input.category,
    description: input.description,
    sectorId: input.sectorId,
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
    history: [
      {
        id: `${id}-H1`,
        at: today,
        status: "reported",
        note: "Reported by a citizen through the CITYTRACE civic register.",
        actor: "citizen",
      },
    ],
  };

  store.created.push(issue);
  store.evidence.push(...evidence);
  writeStore(store);

  return issue;
}

export function confirmIssue(id: string, note?: string): Issue | null {
  const base = findIssue(id);
  if (!base) return null;

  const today = DEMO_NOW;
  const event: IssueEvent = {
    id: `${id}-H${base.history.length + 1}`,
    at: today,
    status: base.status,
    note: note?.trim() || "Citizen confirmed this issue is still present on site.",
    actor: "citizen",
  };

  const updated: Issue = {
    ...base,
    reportCount: base.reportCount + 1,
    updatedAt: today,
    history: [...base.history, event],
  };

  const store = readStore();
  const createdIndex = store.created.findIndex((issue) => issue.id === id);
  if (createdIndex >= 0) {
    store.created[createdIndex] = updated;
  } else {
    store.overrides[id] = updated;
  }
  writeStore(store);

  return updated;
}

export function changeIssueStatus(
  id: string,
  status: IssueStatus,
  note: string
): Issue | null {
  if (!ISSUE_STATUS_ORDER.includes(status)) return null;

  const base = findIssue(id);
  if (!base) return null;

  const today = DEMO_NOW;
  const event: IssueEvent = {
    id: `${id}-H${base.history.length + 1}`,
    at: today,
    status,
    note: note.trim() || `Status moved to ${status}.`,
    actor: status === "under-review" ? "municipal-desk" : "field-team",
  };

  const updated: Issue = {
    ...base,
    status,
    updatedAt: today,
    resolvedAt: status === "resolved" ? today : undefined,
    history: [...base.history, event],
  };

  const store = readStore();
  const createdIndex = store.created.findIndex((issue) => issue.id === id);
  if (createdIndex >= 0) {
    store.created[createdIndex] = updated;
  } else {
    store.overrides[id] = updated;
  }
  writeStore(store);

  return updated;
}
