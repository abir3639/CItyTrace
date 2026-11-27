"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Compass,
  Keyboard,
  Loader2,
  LogIn,
  PlusCircle,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { getDepartment } from "@/lib/departments";
import type { PublicUser } from "@/types/citytrace";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import SignOutButton from "@/components/auth/SignOutButton";

const SHORTCUTS = [
  { keys: "⌘K", label: "Global search & quick jump" },
  { keys: "1–4", label: "Map layers (3D Explorer)" },
  { keys: "H", label: "Toggle map HUD (3D Explorer)" },
  { keys: "Esc", label: "Close panel / clear selection" },
] as const;

/**
 * Interactive session popover with live Demo Role Switcher, quick navigation,
 * keyboard shortcuts, and sign out.
 */
export default function SessionMenu({
  user,
  demoAccounts = [],
}: {
  user: PublicUser | null;
  demoAccounts?: PublicUser[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
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

  const handleDemoSwitch = async (userId: string) => {
    setSwitchingId(userId);
    try {
      const response = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {user ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Session menu and keyboard shortcuts"
          title={`${user.name} · Profile & demo role switcher`}
          className={`hidden h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-left transition-all sm:inline-flex cursor-pointer ${
            open
              ? "border-[#007AFF]/45 bg-white shadow-sm"
              : "border-black/[0.08] bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#007AFF]/35 hover:bg-white"
          }`}
        >
          <UserAvatar initials={user.initials} color={user.avatarColor} size="sm" />
          <span className="max-w-[110px] truncate text-[12.5px] font-semibold text-[#1D1D1F]">
            {user.name.split(" ")[0]}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Session menu and keyboard shortcuts"
          title="Demo role switcher & keyboard shortcuts"
          className={`hidden h-9 w-9 items-center justify-center rounded-full border transition-all sm:inline-flex cursor-pointer ${
            open
              ? "border-[#007AFF]/45 bg-white text-[#007AFF] shadow-sm"
              : "border-black/[0.08] bg-white/85 text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#007AFF]/35 hover:bg-white"
          }`}
        >
          <Keyboard className="h-4 w-4" strokeWidth={1.75} />
        </button>
      )}

      {open ? (
        <div
          role="dialog"
          aria-label="Session details and shortcuts"
          className="ct-glass ct-fade-up absolute right-0 z-50 mt-2.5 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] p-3.5"
        >
          {user ? (
            <div className="flex items-start justify-between gap-2 border-b border-black/[0.06] pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <UserAvatar initials={user.initials} color={user.avatarColor} size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[13.5px] font-semibold text-[#1D1D1F]">
                      {user.name}
                    </p>
                    <RolePill role={user.role} />
                  </div>
                  <p className="truncate text-[11.5px] text-[#6E6E73]">
                    {user.departmentId
                      ? `${getDepartment(user.departmentId)?.shortName ?? user.departmentId} · `
                      : ""}
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] cursor-pointer"
                aria-label="Close session menu"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 border-b border-black/[0.06] pb-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[#1D1D1F]">Guest viewer</p>
                <p className="mt-0.5 text-[11.5px] text-[#6E6E73]">
                  Switch into a Demo Role or sign in with your own account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] cursor-pointer"
                aria-label="Close session menu"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Demo Role Switcher */}
          {demoAccounts.length > 0 ? (
            <div className="border-b border-black/[0.06] py-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868B]">
                <ArrowRightLeft className="h-3 w-3 text-[#007AFF]" />
                Demo role switcher
              </p>
              <div className="grid grid-cols-1 gap-1">
                {demoAccounts.map((acc) => {
                  const active = user?.id === acc.id;
                  const dept = acc.departmentId ? getDepartment(acc.departmentId) : null;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={active || switchingId !== null}
                      onClick={() => void handleDemoSwitch(acc.id)}
                      className={`flex items-center justify-between gap-2 rounded-[11px] px-2 py-1.5 text-left transition-colors cursor-pointer ${
                        active
                          ? "bg-[#007AFF]/[0.1] ring-1 ring-[#007AFF]/20"
                          : "hover:bg-black/[0.045]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          initials={acc.initials}
                          color={acc.avatarColor}
                          size="xs"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-semibold text-[#1D1D1F]">
                            {acc.name}
                          </span>
                          <span className="block truncate text-[10.5px] text-[#6E6E73]">
                            {dept ? dept.shortName : `Sector ${acc.sectorId}`}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {switchingId === acc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-[#007AFF]" />
                        ) : (
                          <RolePill role={acc.role} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-1 py-2">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868B]">
              Quick actions
            </p>
            {user ? (
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.045]"
              >
                <UserCheck className="h-4 w-4 text-[#007AFF]" />
                My Civic Profile &amp; Watchlist
              </Link>
            ) : null}
            <Link
              href="/civic-issues/report"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.045]"
            >
              <PlusCircle className="h-4 w-4 text-[#007AFF]" />
              Report a civic issue
            </Link>
            <Link
              href="/city-explorer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.045]"
            >
              <Compass className="h-4 w-4 text-[#007AFF]" />
              Explore 3D Dhaka
            </Link>
            <Link
              href="/ai-investigation"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.045]"
            >
              <Sparkles className="h-4 w-4 text-[#007AFF]" />
              AI Investigation Engine
            </Link>
          </div>

          <div className="rounded-[14px] bg-[#F5F5F7] p-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1D1D1F]">
              <Keyboard className="h-3.5 w-3.5 text-[#007AFF]" />
              Keyboard shortcuts
            </p>
            <dl className="mt-1.5 space-y-1">
              {SHORTCUTS.map((item) => (
                <div
                  key={item.keys}
                  className="flex items-center justify-between gap-2 text-[11.5px]"
                >
                  <dt className="text-[#6E6E73]">{item.label}</dt>
                  <dd>
                    <kbd className="rounded-md border border-black/[0.08] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#1D1D1F] shadow-2xs tabular-nums">
                      {item.keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-2.5 flex items-center gap-2 border-t border-black/[0.06] pt-2.5">
            {user ? (
              <SignOutButton
                onSignedOut={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1D1D1F] transition-colors hover:border-[#FF3B30]/30 hover:bg-[#FF3B30]/[0.06] hover:text-[#C9241B] cursor-pointer"
              />
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#007AFF]" />
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#0066D6]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
