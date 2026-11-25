"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import type { SearchIssue } from "@/lib/search";
import type { ActivityEvent } from "@/lib/stats";

const STORAGE_KEY = "citytrace.sidebarCollapsed";

/**
 * Application shell: macOS-inspired frosted glass sidebar, floating glass header,
 * and spacious content canvas.
 */
export default function AppShell({
  children,
  searchIssues,
  recentEvents,
}: {
  children: React.ReactNode;
  searchIssues: SearchIssue[];
  recentEvents: ActivityEvent[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const mobileOpen = mobileOpenPath === pathname;
  const isExplorer = pathname.startsWith("/city-explorer");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of a persisted preference
      if (stored === "1") setCollapsed(true);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  };

  const closeMobile = () => setMobileOpenPath(null);

  return (
    <div className="relative min-h-screen bg-[#F5F5F7]">
      {/* Soft ambient colour washes behind the floating Liquid Glass sidebar */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-[#007AFF]/[0.13] blur-[76px]" />
        <div className="absolute top-[38%] -left-28 h-[320px] w-[320px] rounded-full bg-[#34C759]/[0.09] blur-[76px]" />
        <div className="absolute -bottom-24 -left-20 h-[340px] w-[340px] rounded-full bg-[#FF9500]/[0.10] blur-[76px]" />
      </div>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:border focus:border-[#007AFF] focus:bg-white focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-[#007AFF] focus:shadow-lg"
      >
        Skip to main content
      </a>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapse}
        onNavigate={closeMobile}
        onCloseMobile={closeMobile}
      />

      <div
        className={`relative z-10 flex min-h-screen flex-col transition-[padding] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          collapsed ? "lg:pl-[90px]" : "lg:pl-[260px]"
        }`}
      >
        <TopBar
          onOpenMobileNav={() => setMobileOpenPath(pathname)}
          searchIssues={searchIssues}
          recentEvents={recentEvents}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className={`mx-auto w-full flex-1 ${
            isExplorer
              ? "max-w-[1680px] px-4 py-3 lg:px-6 lg:py-3.5"
              : "max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7"
          }`}
        >
          {children}
        </main>

        <footer
          className={`mx-auto w-full px-4 pb-6 sm:px-6 lg:px-8 ${
            isExplorer ? "max-w-[1680px] pt-2" : "max-w-[1440px] pt-4"
          }`}
        >
          <p className="border-t border-black/[0.06] pt-4 text-[12px] leading-relaxed text-[#86868B]">
            CityTrace is a civic transparency prototype. All projects, authorities, budgets,
            and records shown here are simulated demonstration data and do not represent
            official government records.
          </p>
        </footer>
      </div>
    </div>
  );
}
