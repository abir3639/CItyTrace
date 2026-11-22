"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { findNavItem } from "@/lib/navigation";
import type { SearchIssue } from "@/lib/search";
import GlobalSearch from "./GlobalSearch";
import NotificationsMenu from "./NotificationsMenu";

export default function TopBar({
  onOpenMobileNav,
  searchIssues,
}: {
  onOpenMobileNav: () => void;
  searchIssues: SearchIssue[];
}) {
  const pathname = usePathname();
  const current = findNavItem(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-500/15 bg-[#070d18]/92 backdrop-blur-md">
      <div className="flex h-[57px] items-center gap-2 px-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-400 uppercase">
            {current?.label ?? "CITYTRACE"}
          </p>
          <p className="hidden truncate font-mono text-[9px] text-slate-500 sm:block">
            {current?.description ?? "Dhaka Sector 04 · Simulated civic district"}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GlobalSearch issues={searchIssues} />
          <NotificationsMenu />

          <div
            className="hidden items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1 sm:flex"
            title="Read-only demonstration session — no account is required or stored."
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-500/20 font-mono text-[10px] font-bold text-cyan-200">
              DC
            </span>
            <span className="hidden leading-tight md:block">
              <span className="block font-mono text-[10px] text-slate-200">Demo Citizen</span>
              <span className="block font-mono text-[9px] text-slate-500">Read-only session</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
