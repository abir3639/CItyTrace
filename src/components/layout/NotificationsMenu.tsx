"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, X } from "lucide-react";
import type { ActivityEvent } from "@/lib/stats";
import { ISSUE_STATUS_LABELS } from "@/types/citytrace";
import { TONES, formatDate, issueStatusTone } from "@/utils/formatters";

/**
 * Floating glass notification menu backed by live issue history.
 */
export default function NotificationsMenu({ events }: { events: ActivityEvent[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer ${
          open
            ? "border-[#007AFF]/40 bg-white text-[#007AFF] shadow-sm"
            : "border-black/[0.08] bg-white/85 text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white"
        }`}
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {events.length > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#007AFF] px-1 text-[10px] font-semibold text-white tabular-nums">
            {events.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Recent civic updates"
          className="ct-glass ct-fade-up absolute right-0 z-50 mt-2.5 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[20px]"
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#1D1D1F]">
              Recent civic updates
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="ct-scroll max-h-80 divide-y divide-black/[0.05] overflow-y-auto">
            {events.map((event) => {
              const tone = issueStatusTone(event.status);
              return (
                <li key={event.id}>
                  <Link
                    href={`/civic-issues/${event.issueId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-black/[0.035]"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONES[tone].dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                          {event.issueCode}
                        </span>
                        <span className={`text-[11.5px] font-medium ${TONES[tone].label}`}>
                          {ISSUE_STATUS_LABELS[event.status]}
                        </span>
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
            })}
          </ul>

          <Link
            href="/civic-issues"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-black/[0.06] bg-black/[0.02] px-4 py-2.5 text-[12.5px] font-medium text-[#007AFF] hover:bg-black/[0.04]"
          >
            <span>Open civic issue register</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
