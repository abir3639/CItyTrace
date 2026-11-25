"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DemoBadge } from "@/components/ui/Badge";
import { findNavItem } from "@/lib/navigation";
import type { SearchIssue } from "@/lib/search";
import type { ActivityEvent } from "@/lib/stats";
import GlobalSearch from "./GlobalSearch";
import NotificationsMenu from "./NotificationsMenu";

export default function TopBar({
  onOpenMobileNav,
  searchIssues,
  recentEvents,
}: {
  onOpenMobileNav: () => void;
  searchIssues: SearchIssue[];
  recentEvents: ActivityEvent[];
}) {
  const pathname = usePathname();
  const current = findNavItem(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-[#F5F5F7]/78 backdrop-blur-2xl backdrop-saturate-[180%]">
      <div className="mx-auto flex h-[60px] max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white/85 text-[#1D1D1F] transition-colors hover:bg-white lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
          {current?.label ?? "CityTrace"}
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <GlobalSearch issues={searchIssues} />
          <DemoBadge label="Demo" className="hidden md:inline-flex" />
          <NotificationsMenu events={recentEvents} />

          <div
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white/85 text-[12px] font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:flex"
            title="Demo Citizen · Read-only session"
            aria-label="Demo Citizen profile"
          >
            DC
          </div>
        </div>
      </div>
    </header>
  );
}
