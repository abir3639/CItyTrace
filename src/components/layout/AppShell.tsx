"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import type { SearchIssue } from "@/lib/search";

const STORAGE_KEY = "citytrace.sidebarCollapsed";

/**
 * Application shell: collapsible sidebar, sticky top bar, scrolling content.
 * Owns the navigation state the whole app shares.
 */
export default function AppShell({
  children,
  searchIssues,
}: {
  children: React.ReactNode;
  searchIssues: SearchIssue[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  /**
   * The route the drawer was opened on. Deriving "open" from the current
   * pathname means navigating closes it without an effect.
   */
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const mobileOpen = mobileOpenPath === pathname;

  // Restore the stored sidebar preference once, after hydration, so the server
  // and first client render produce identical markup.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of a persisted preference
      if (stored === "1") setCollapsed(true);
    } catch {
      // Storage may be unavailable (private mode); the default layout is fine.
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
    <div className="min-h-screen">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] lg:hidden"
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
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]"
        }`}
      >
        <TopBar
          onOpenMobileNav={() => setMobileOpenPath(pathname)}
          searchIssues={searchIssues}
        />

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 lg:px-6 lg:py-6"
        >
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1560px] px-4 pb-6 lg:px-6">
          <div className="ct-rule mb-3" />
          <p className="font-mono text-[10px] leading-relaxed text-slate-500">
            CITYTRACE is a hackathon prototype. Every project, authority, budget,
            document and photograph in this application is fictional demonstration
            data and does not represent any real government record.
          </p>
        </footer>
      </div>
    </div>
  );
}
