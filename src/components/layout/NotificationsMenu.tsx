"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, X } from "lucide-react";
import { getActivitySince } from "@/lib/stats";
import { ISSUE_STATUS_LABELS } from "@/types/citytrace";
import { TONES, formatDate, issueStatusTone } from "@/utils/formatters";

/**
 * Notification indicator backed by the real issue history — every entry is an
 * actual status event from the dataset, not a fabricated alert.
 */
export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Events from the last two weeks of the simulated snapshot.
  const events = getActivitySince(14, 6);

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
        aria-label={`Notifications: ${events.length} recent civic updates`}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
          open
            ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
            : "border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
        }`}
      >
        <Bell className="h-3.5 w-3.5" />
        {events.length > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 font-mono text-[9px] font-bold text-slate-950">
            {events.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Recent civic updates"
          className="ct-panel ct-fade-up absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-cyan-300 uppercase">
              Recent Civic Updates
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="ct-scroll max-h-80 divide-y divide-slate-800/80 overflow-y-auto">
            {events.map((event) => {
              const tone = issueStatusTone(event.status);
              return (
                <li key={event.id}>
                  <Link
                    href={`/civic-issues/${event.issueId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-slate-800/50"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONES[tone].dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-cyan-300">
                          {event.issueCode}
                        </span>
                        <span className={`font-mono text-[9px] ${TONES[tone].label}`}>
                          {ISSUE_STATUS_LABELS[event.status]}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-200">
                        {event.note}
                      </span>
                      <span className="mt-0.5 block font-mono text-[9px] text-slate-500">
                        {formatDate(event.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/civic-issues"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-slate-800 px-3 py-2 font-mono text-[10px] text-cyan-300 hover:bg-slate-800/40"
          >
            <span>Open civic issue register</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
