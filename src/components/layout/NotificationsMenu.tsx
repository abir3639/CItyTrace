"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCheck, X } from "lucide-react";
import type { ActivityEvent } from "@/lib/stats";
import {
  ISSUE_STATUS_LABELS,
  type NotificationCategory,
  type UserNotification,
} from "@/types/citytrace";
import { TONES, formatDate, issueStatusTone } from "@/utils/formatters";

const READ_STORAGE_KEY = "citytrace.readNotifications";
const READ_CHANGE_EVENT = "citytrace:read-notifications-changed";

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  new_issue: "New report",
  official_response: "Official response",
  status_update: "Status update",
  deadline_change: "Deadline",
  sla_breach: "SLA alert",
  repair_submitted: "Inspection",
  verification_outcome: "Verified",
  reopened_issue: "Reopened",
  project_update: "Project",
};

function subscribeReadIds(callback: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === READ_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(READ_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(READ_CHANGE_EVENT, callback);
  };
}

function getReadIdsSnapshot(): string {
  try {
    return window.localStorage.getItem(READ_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerReadIdsSnapshot(): string {
  return "[]";
}

function persistReadIds(ids: string[]) {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(READ_CHANGE_EVENT));
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Floating glass notification menu:
 * - For signed-in users: isolated per-user persisted notifications (Watchlists, SLA, Verifications)
 * - For guests: recent district civic activity with local read state
 */
export default function NotificationsMenu({
  events,
  userNotifications,
  signedIn = false,
}: {
  events: ActivityEvent[];
  userNotifications?: UserNotification[];
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [serverReadIds, setServerReadIds] = useState<string[]>([]);

  const readRaw = useSyncExternalStore(
    subscribeReadIds,
    getReadIdsSnapshot,
    getServerReadIdsSnapshot
  );

  const guestReadSet = useMemo(() => {
    try {
      const parsed = JSON.parse(readRaw) as unknown;
      return Array.isArray(parsed)
        ? new Set(parsed.filter((item): item is string => typeof item === "string"))
        : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }, [readRaw]);

  const personalItems = useMemo(
    () =>
      (userNotifications ?? []).map((item) => ({
        ...item,
        read: item.read || serverReadIds.includes(item.id),
      })),
    [userNotifications, serverReadIds]
  );

  const unreadCount = signedIn
    ? personalItems.filter((item) => !item.read).length
    : events.filter((event) => !guestReadSet.has(event.id)).length;

  const markGuestRead = (id: string) => {
    if (guestReadSet.has(id)) return;
    const next = new Set(guestReadSet);
    next.add(id);
    persistReadIds([...next]);
  };

  const markServerRead = async (notificationId?: string) => {
    if (notificationId) {
      setServerReadIds((prev) =>
        prev.includes(notificationId) ? prev : [...prev, notificationId]
      );
    } else {
      setServerReadIds(personalItems.map((i) => i.id));
    }
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          notificationId ? { notificationId } : { all: true }
        ),
      });
      router.refresh();
    } catch {
      // Non-fatal
    }
  };

  const markAllRead = () => {
    if (signedIn) {
      void markServerRead();
    } else {
      const next = new Set(guestReadSet);
      for (const event of events) next.add(event.id);
      persistReadIds([...next]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Notifications: ${unreadCount} unread civic updates`
            : "Notifications: all caught up"
        }
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer ${
          open
            ? "border-[#007AFF]/40 bg-white text-[#007AFF] shadow-sm"
            : "border-black/[0.08] bg-white/85 text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white"
        }`}
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#007AFF] px-1 text-[10px] font-semibold text-white tabular-nums">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Recent civic updates"
          className="ct-glass ct-fade-up absolute right-0 z-50 mt-2.5 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-[20px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#1D1D1F]">
                {signedIn ? "Your civic notifications" : "Recent civic updates"}
              </p>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#007AFF]/[0.1] px-2 py-0.5 text-[10.5px] font-semibold text-[#0055CC] tabular-nums">
                  {unreadCount} new
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[#007AFF] transition-colors hover:bg-[#007AFF]/[0.08] cursor-pointer"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <ul className="ct-scroll max-h-80 divide-y divide-black/[0.05] overflow-y-auto">
            {signedIn ? (
              personalItems.length === 0 ? (
                <li className="px-4 py-8 text-center text-[12.5px] text-[#6E6E73]">
                  Follow issues, sectors, or projects to receive targeted alerts here.
                </li>
              ) : (
                personalItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (!item.read) void markServerRead(item.id);
                        setOpen(false);
                      }}
                      className={`flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-black/[0.035] ${
                        item.read ? "opacity-75" : "bg-[#007AFF]/[0.025]"
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.category === "sla_breach" || item.category === "reopened_issue"
                            ? "bg-[#FF3B30]"
                            : item.category === "verification_outcome"
                              ? "bg-[#34C759]"
                              : "bg-[#007AFF]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10.5px] font-semibold text-[#48484A]">
                            {CATEGORY_LABEL[item.category]}
                          </span>
                          {!item.read ? (
                            <span
                              aria-label="Unread"
                              className="h-1.5 w-1.5 rounded-full bg-[#007AFF]"
                            />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-[12.5px] font-semibold leading-snug text-[#1D1D1F]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-[#48484A]">
                          {item.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#6E6E73] tabular-nums">
                          {formatDate(item.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))
              )
            ) : (
              events.map((event) => {
                const tone = issueStatusTone(event.status);
                const isRead = guestReadSet.has(event.id);
                return (
                  <li key={event.id}>
                    <Link
                      href={`/civic-issues/${event.issueId}`}
                      onClick={() => {
                        markGuestRead(event.id);
                        setOpen(false);
                      }}
                      className={`flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-black/[0.035] ${
                        isRead ? "opacity-75" : "bg-[#007AFF]/[0.025]"
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONES[tone].dot}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                              {event.issueCode}
                            </span>
                            <span className={`text-[11.5px] font-medium ${TONES[tone].label}`}>
                              {ISSUE_STATUS_LABELS[event.status]}
                            </span>
                            {event.actorName ? (
                              <span className="text-[11px] font-medium text-[#6E6E73]">
                                · {event.actorName}
                              </span>
                            ) : null}
                          </span>
                          {!isRead ? (
                            <span
                              aria-label="Unread"
                              className="h-1.5 w-1.5 rounded-full bg-[#007AFF]"
                            />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-[#1D1D1F]">
                          {event.note}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#6E6E73] tabular-nums">
                          {formatDate(event.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          <Link
            href={signedIn ? "/profile" : "/civic-issues"}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-black/[0.06] bg-black/[0.02] px-4 py-2.5 text-[12.5px] font-medium text-[#007AFF] hover:bg-black/[0.04]"
          >
            <span>{signedIn ? "Manage Watchlist & Profile" : "Open civic issue register"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
