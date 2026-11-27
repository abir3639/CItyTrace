"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { projectsById } from "@/data";
import { findNavItem } from "@/lib/navigation";
import type { SearchIssue } from "@/lib/search";
import type { ActivityEvent } from "@/lib/stats";
import type { PublicUser, UserNotification } from "@/types/citytrace";
import { RolePill } from "@/components/ui/UserAvatar";
import GlobalSearch from "./GlobalSearch";
import NotificationsMenu from "./NotificationsMenu";
import SessionMenu from "./SessionMenu";

function resolveBreadcrumb(
  pathname: string,
  searchIssues: SearchIssue[]
): { parentLabel: string; parentHref: string; leafLabel: string; tabular?: boolean } | null {
  if (pathname === "/civic-issues/report") {
    return {
      parentLabel: "Civic Issues",
      parentHref: "/civic-issues",
      leafLabel: "Report Issue",
    };
  }

  if (pathname.startsWith("/civic-issues/")) {
    const id = pathname.slice("/civic-issues/".length).split("/")[0];
    if (id) {
      const matched = searchIssues.find((item) => item.id === id);
      return {
        parentLabel: "Civic Issues",
        parentHref: "/civic-issues",
        leafLabel: matched?.code ?? id,
        tabular: true,
      };
    }
  }

  if (pathname.startsWith("/public-projects/")) {
    const id = pathname.slice("/public-projects/".length).split("/")[0];
    if (id) {
      const matched = projectsById.get(id);
      return {
        parentLabel: "Public Projects",
        parentHref: "/public-projects",
        leafLabel: matched?.code ?? id,
        tabular: true,
      };
    }
  }

  return null;
}

export default function TopBar({
  onOpenMobileNav,
  searchIssues,
  recentEvents,
  userNotifications,
  currentUser,
  demoAccounts,
}: {
  onOpenMobileNav: () => void;
  searchIssues: SearchIssue[];
  recentEvents: ActivityEvent[];
  userNotifications: UserNotification[];
  currentUser: PublicUser | null;
  demoAccounts: PublicUser[];
}) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const breadcrumb = resolveBreadcrumb(pathname, searchIssues);
  const pageTitle = pathname === "/profile" ? "My Civic Profile" : current?.label ?? "CityTrace";

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

        <nav aria-label="Breadcrumb" className="min-w-0">
          {breadcrumb ? (
            <ol className="flex items-center gap-1.5 truncate text-[15px] tracking-[-0.015em]">
              <li className="shrink-0">
                <Link
                  href={breadcrumb.parentHref}
                  className="font-medium text-[#6E6E73] transition-colors hover:text-[#1D1D1F]"
                >
                  {breadcrumb.parentLabel}
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0 text-[#86868B]">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li
                aria-current="page"
                className={`truncate font-semibold text-[#1D1D1F] ${
                  breadcrumb.tabular ? "tabular-nums" : ""
                }`}
              >
                {breadcrumb.leafLabel}
              </li>
            </ol>
          ) : (
            <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              {pageTitle}
            </p>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GlobalSearch issues={searchIssues} />
          <NotificationsMenu
            events={recentEvents}
            userNotifications={currentUser ? userNotifications : undefined}
            signedIn={Boolean(currentUser)}
          />

          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <RolePill role={currentUser.role} className="hidden md:inline-flex" />
              <SessionMenu user={currentUser} demoAccounts={demoAccounts} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="hidden h-9 items-center rounded-full border border-black/[0.08] bg-white/85 px-3.5 text-[12.5px] font-semibold text-[#1D1D1F] shadow-2xs transition-colors hover:bg-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-full bg-[#007AFF] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6] active:scale-[0.98]"
              >
                Register
              </Link>
              <SessionMenu user={null} demoAccounts={demoAccounts} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
