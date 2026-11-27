import type {
  NotificationCategory,
  UserNotification,
  UserRole,
  UserWatchlist,
  WatchlistEntityType,
} from "@/types/citytrace";
import { listPublicUsers } from "./auth-store";
import { readState, updateState } from "./db";
import { DEMO_NOW } from "./stats";

/**
 * Runtime watchlist & isolated per-user notification store.
 *
 * Persisted as the `governance` row of the Supabase `app_state` table (see
 * `./db`), or in the OS temp directory when Supabase is not configured.
 * Cleared by `npm run reset:demo`.
 *
 * Server-only — never import this from a client component.
 */

const STORE_KEY = "governance";

interface GovernanceStoreShape {
  watchlists: Record<string, UserWatchlist>;
  notifications: Record<string, UserNotification[]>;
}

const DEFAULT_SEEDED_WATCHLISTS: Record<string, UserWatchlist> = {
  "USR-001": {
    issues: ["ISS-003", "ISS-011"],
    sectors: ["S04"],
    projects: ["P-R01"],
  },
  "USR-003": {
    issues: ["ISS-016", "ISS-003"],
    sectors: ["S04", "S07"],
    projects: ["P-R01"],
  },
  "USR-004": {
    issues: ["ISS-003", "ISS-009", "ISS-012", "ISS-015"],
    sectors: ["S04", "S06", "S07"],
    projects: ["P-R01"],
  },
  "USR-005": {
    issues: ["ISS-005", "ISS-021"],
    sectors: ["S02", "S11"],
    projects: ["P-D02"],
  },
};

const DEFAULT_SEEDED_NOTIFICATIONS: Record<string, UserNotification[]> = {
  "USR-001": [
    {
      id: "NOTIF-SEED-1",
      dedupeKey: "seed:ISS-003:reopened",
      userId: "USR-001",
      category: "verification_outcome",
      title: "CT-ISS-003 verification rejected — Reopened",
      message:
        "Nusrat Jahan rejected Repair #3 on Begum Rokeya Sarani Link Road after core thickness & flood audit.",
      href: "/civic-issues/ISS-003",
      at: "2025-07-14",
      read: false,
      issueId: "ISS-003",
      sectorId: "S04",
      projectId: "P-R01",
    },
    {
      id: "NOTIF-SEED-2",
      dedupeKey: "seed:ISS-022:new_S04",
      userId: "USR-001",
      category: "new_issue",
      title: "New report in followed sector S04",
      message:
        "CT-ISS-022 reported in Central-West and awaiting Verifier intake review.",
      href: "/civic-issues/ISS-022",
      at: "2025-07-16",
      read: false,
      issueId: "ISS-022",
      sectorId: "S04",
    },
  ],
  "USR-003": [
    {
      id: "NOTIF-SEED-3",
      dedupeKey: "seed:ISS-016:awaiting_verification",
      userId: "USR-003",
      category: "repair_submitted",
      title: "Inspection queue: CT-ISS-016 Awaiting Verification",
      message:
        "Lighting unit submitted feeder cable repair completion for CT-ISS-016 (WO-2025-0715) awaiting independent inspection.",
      href: "/civic-issues/ISS-016",
      at: "2025-07-17",
      read: false,
      issueId: "ISS-016",
      sectorId: "S07",
      projectId: "P-L09",
    },
    {
      id: "NOTIF-SEED-4",
      dedupeKey: "seed:ISS-011:recurrence",
      userId: "USR-003",
      category: "status_update",
      title: "Pending recurrence request on CT-ISS-011",
      message:
        "Farhana Rahman submitted a recurrence report on a resolved East Boulevard school-zone crossing issue.",
      href: "/civic-issues/ISS-011",
      at: "2025-07-20",
      read: false,
      issueId: "ISS-011",
      sectorId: "S11",
      projectId: "P-S11",
    },
  ],
  "USR-004": [
    {
      id: "NOTIF-SEED-5",
      dedupeKey: "seed:ISS-003:reopened",
      userId: "USR-004",
      category: "reopened_issue",
      title: "Action required: CT-ISS-003 Reopened on P-R01",
      message:
        "Repair #3 verification failed for Begum Rokeya Sarani junction; catch-pit drainage remediation required.",
      href: "/civic-issues/ISS-003",
      at: "2025-07-14",
      read: false,
      issueId: "ISS-003",
      sectorId: "S04",
      projectId: "P-R01",
    },
  ],
  "USR-005": [
    {
      id: "NOTIF-SEED-6",
      dedupeKey: "seed:ISS-021:under_review",
      userId: "USR-005",
      category: "status_update",
      title: "Reviewed drainage report awaiting action: CT-ISS-021",
      message:
        "Standing water outside East Boulevard clinic moved to Under Review by Nusrat Jahan.",
      href: "/civic-issues/ISS-021",
      at: "2025-07-05",
      read: false,
      issueId: "ISS-021",
      sectorId: "S11",
    },
  ],
};

function emptyStore(): GovernanceStoreShape {
  return { watchlists: {}, notifications: {} };
}

/**
 * Repairs a stored value in place so it always has both maps. Works in place
 * (rather than returning a copy) so changes made inside `updateState` are saved.
 */
function normalizeStore(raw: Partial<GovernanceStoreShape>): GovernanceStoreShape {
  if (!raw.watchlists || typeof raw.watchlists !== "object") raw.watchlists = {};
  if (!raw.notifications || typeof raw.notifications !== "object") raw.notifications = {};
  return raw as GovernanceStoreShape;
}

async function readGovernanceStore(): Promise<GovernanceStoreShape> {
  return normalizeStore(
    await readState<Partial<GovernanceStoreShape>>(STORE_KEY, emptyStore())
  );
}

/** Read, change and save the store. `mutate` must have no side effects — it may run more than once. */
function updateGovernanceStore<R>(mutate: (store: GovernanceStoreShape) => R): Promise<R> {
  return updateState<Partial<GovernanceStoreShape>, R>(STORE_KEY, emptyStore(), (raw) =>
    mutate(normalizeStore(raw))
  );
}

function emptyWatchlist(): UserWatchlist {
  return { issues: [], sectors: [], projects: [] };
}

function watchlistFrom(store: GovernanceStoreShape, userId: string): UserWatchlist {
  const stored = store.watchlists[userId];
  if (stored) {
    return {
      issues: Array.isArray(stored.issues) ? stored.issues : [],
      sectors: Array.isArray(stored.sectors) ? stored.sectors : [],
      projects: Array.isArray(stored.projects) ? stored.projects : [],
    };
  }
  const seeded = DEFAULT_SEEDED_WATCHLISTS[userId];
  return seeded
    ? {
        issues: [...seeded.issues],
        sectors: [...seeded.sectors],
        projects: [...seeded.projects],
      }
    : emptyWatchlist();
}

export async function getUserWatchlist(userId: string): Promise<UserWatchlist> {
  return watchlistFrom(await readGovernanceStore(), userId);
}

export async function toggleWatchlistItem(
  userId: string,
  entityType: WatchlistEntityType,
  entityId: string
): Promise<{ watchlist: UserWatchlist; following: boolean }> {
  const key =
    entityType === "issue"
      ? "issues"
      : entityType === "sector"
        ? "sectors"
        : "projects";

  return updateGovernanceStore((store) => {
    const current = watchlistFrom(store, userId);
    const list = [...current[key]];
    const exists = list.includes(entityId);
    const nextList = exists
      ? list.filter((item) => item !== entityId)
      : [...list, entityId];

    const updated: UserWatchlist = {
      ...current,
      [key]: nextList,
    };
    store.watchlists[userId] = updated;

    return { watchlist: updated, following: !exists };
  });
}

function notificationsFrom(store: GovernanceStoreShape, userId: string): UserNotification[] {
  const existing = store.notifications[userId];
  const base = existing ?? DEFAULT_SEEDED_NOTIFICATIONS[userId] ?? [];
  return [...base].sort((a, b) => b.at.localeCompare(a.at));
}

export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  return notificationsFrom(await readGovernanceStore(), userId);
}

function ensureUserNotificationBucket(
  store: GovernanceStoreShape,
  userId: string
): UserNotification[] {
  if (!store.notifications[userId]) {
    store.notifications[userId] = [
      ...(DEFAULT_SEEDED_NOTIFICATIONS[userId] ?? []),
    ];
  }
  return store.notifications[userId];
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<UserNotification[]> {
  return updateGovernanceStore((store) => {
    const list = ensureUserNotificationBucket(store, userId);
    store.notifications[userId] = list.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item
    );
    return notificationsFrom(store, userId);
  });
}

export async function markAllNotificationsRead(userId: string): Promise<UserNotification[]> {
  return updateGovernanceStore((store) => {
    const list = ensureUserNotificationBucket(store, userId);
    store.notifications[userId] = list.map((item) => ({ ...item, read: true }));
    return notificationsFrom(store, userId);
  });
}

export interface DispatchNotificationInput {
  dedupeKey: string;
  category: NotificationCategory;
  title: string;
  message: string;
  href: string;
  issueId?: string;
  sectorId?: string;
  projectId?: string;
  departmentId?: string;
  targetRoles?: UserRole[];
  explicitUserIds?: string[];
  excludeUserId?: string;
  at?: string;
}

/**
 * Generates isolated per-user notifications for followers of the affected
 * issue/sector/project plus authorized department officials or verifiers,
 * strictly deduplicated by `dedupeKey` per recipient.
 */
export async function dispatchAccountabilityNotifications(
  input: DispatchNotificationInput
): Promise<void> {
  const users = listPublicUsers();
  const timestamp = input.at ?? DEMO_NOW;

  await updateGovernanceStore((store) => {
    const recipientIds = new Set<string>(input.explicitUserIds ?? []);

    for (const user of users) {
      if (input.excludeUserId && user.id === input.excludeUserId) continue;

      // 1. Direct watchlist interest
      const wl = store.watchlists[user.id] ?? DEFAULT_SEEDED_WATCHLISTS[user.id];
      const followsIssue = input.issueId ? wl?.issues.includes(input.issueId) : false;
      const followsSector = input.sectorId ? wl?.sectors.includes(input.sectorId) : false;
      const followsProject = input.projectId ? wl?.projects.includes(input.projectId) : false;

      if (followsIssue || followsSector || followsProject) {
        recipientIds.add(user.id);
      }

      // 2. Role & department responsibility targeting
      if (input.targetRoles?.includes(user.role)) {
        if (user.role === "official") {
          if (!input.departmentId || user.departmentId === input.departmentId) {
            recipientIds.add(user.id);
          }
        } else {
          recipientIds.add(user.id);
        }
      }
    }

    for (const userId of recipientIds) {
      if (input.excludeUserId && userId === input.excludeUserId) continue;
      const bucket = ensureUserNotificationBucket(store, userId);
      if (bucket.some((item) => item.dedupeKey === input.dedupeKey)) {
        continue;
      }

      bucket.unshift({
        id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dedupeKey: input.dedupeKey,
        userId,
        category: input.category,
        title: input.title,
        message: input.message,
        href: input.href,
        at: timestamp,
        read: false,
        ...(input.issueId ? { issueId: input.issueId } : {}),
        ...(input.sectorId ? { sectorId: input.sectorId } : {}),
        ...(input.projectId ? { projectId: input.projectId } : {}),
      });
    }
  });
}
