"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ShieldAlert } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
  onCloseMobile: () => void;
}

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-950/50 shadow-[0_0_20px_-4px_rgba(34,211,238,0.45)]">
      <svg viewBox="0 0 36 36" fill="none" className="h-5 w-5 text-cyan-300" aria-hidden="true">
        <path
          d="M18 3L31 10.5V25.5L18 33L5 25.5V10.5L18 3Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="18" cy="18" r="5.5" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2.5 2" />
        <circle cx="18" cy="18" r="2.2" fill="#22d3ee" />
      </svg>
    </span>
  );
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onNavigate,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary navigation"
      className={[
        "fixed top-0 left-0 z-50 flex h-full w-[248px] flex-col border-r border-slate-800/80 bg-[#070d18]/96 backdrop-blur-lg",
        "transition-[transform,width] duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        collapsed ? "lg:w-[76px]" : "lg:w-[248px]",
      ].join(" ")}
    >
      {/* Brand */}
      <div className="flex h-[57px] shrink-0 items-center gap-2.5 border-b border-slate-800/80 px-3.5">
        <Link href="/" onClick={onNavigate} aria-label="CITYTRACE home" className="flex items-center gap-2.5">
          <BrandMark />
          <span className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <span className="block text-sm font-bold tracking-[0.16em] text-slate-50">
              CITY<span className="text-cyan-400">TRACE</span>
            </span>
            <span className="block font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase">
              Civic Intelligence
            </span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="ct-scroll flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                    active
                      ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/40"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
                  ].join(" ")}
                >
                  {active ? (
                    <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  ) : null}
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-cyan-300" : "text-slate-400 group-hover:text-cyan-300"}`}
                  />
                  <span className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                    <span className="block truncate text-[12.5px] font-medium leading-tight">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[9px] leading-tight text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-2 border-t border-slate-800/80 p-2.5">
        <div
          className={`flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 ${collapsed ? "lg:justify-center" : ""}`}
          title="All CITYTRACE records are fictional demonstration data."
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className={`font-mono text-[9px] font-semibold tracking-[0.08em] text-amber-200 ${collapsed ? "lg:hidden" : ""}`}>
            SIMULATED DATA
          </span>
        </div>

        <div className={`flex items-center gap-1.5 ${collapsed ? "lg:flex-col" : ""}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1.5 font-mono text-[10px] text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 lg:flex cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronsLeft className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1.5 font-mono text-[10px] text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 lg:hidden cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </aside>
  );
}
