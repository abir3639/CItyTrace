"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { DemoBadge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { USER_ROLE_LABELS, type PublicUser } from "@/types/citytrace";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
  onCloseMobile: () => void;
  currentUser: PublicUser | null;
}

function BrandMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#007AFF] text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)]">
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <path
          d="M12 3.5L19.5 7.75V16.25L12 20.5L4.5 16.25V7.75L12 3.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.75" fill="currentColor" />
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
  currentUser,
}: SidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [suppressHover, setSuppressHover] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const isHoverPreview = collapsed && (hovered || focusExpanded) && !suppressHover;
  const isVisuallyCollapsed = collapsed && !isHoverPreview;

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    clearLeaveTimer();
    if (collapsed && !suppressHover) {
      setHovered(true);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    clearLeaveTimer();
    if (suppressHover) {
      setSuppressHover(false);
      setHovered(false);
      return;
    }
    if (hovered) {
      leaveTimerRef.current = setTimeout(() => {
        setHovered(false);
        leaveTimerRef.current = null;
      }, 90);
    }
  };

  const handleFocusCapture = (e: React.FocusEvent<HTMLElement>) => {
    if (
      collapsed &&
      !suppressHover &&
      e.target instanceof HTMLElement &&
      e.target.matches(":focus-visible")
    ) {
      setFocusExpanded(true);
    }
  };

  const handleBlurCapture = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setFocusExpanded(false);
    }
  };

  const handleToggleClick = () => {
    clearLeaveTimer();
    setHovered(false);
    setFocusExpanded(false);
    if (!collapsed) {
      setSuppressHover(true);
    } else {
      setSuppressHover(false);
    }
    onToggleCollapse();
  };

  return (
    <aside
      aria-label="Application sidebar"
      data-hover-expanded={isHoverPreview ? "true" : undefined}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      className={[
        "ct-sidebar-glass fixed top-0 bottom-0 left-0 z-50 flex h-full w-[248px] flex-col overflow-x-hidden rounded-r-[26px]",
        "lg:top-3 lg:bottom-3 lg:left-3 lg:h-auto lg:rounded-[26px]",
        isHoverPreview ? "ct-sidebar-glass-overlay" : "",
        "transition-[transform,width,box-shadow,background] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        isVisuallyCollapsed ? "lg:w-[78px]" : "lg:w-[248px]",
      ].join(" ")}
    >
      {/* Brand */}
      <div className="relative z-10 flex h-[60px] shrink-0 items-center px-3">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="CityTrace home"
          className="flex w-full items-center gap-2.5 overflow-hidden rounded-xl px-[10px] py-1"
        >
          <BrandMark />
          <span
            className={`whitespace-nowrap text-[16px] font-semibold tracking-[-0.025em] text-[#1D1D1F] transition-opacity duration-200 motion-reduce:transition-none ${
              isVisuallyCollapsed ? "lg:pointer-events-none lg:opacity-0" : "opacity-100"
            }`}
          >
            CityTrace
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" className="ct-scroll relative z-10 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2">
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
                  title={isVisuallyCollapsed ? item.label : undefined}
                  className={[
                    "group flex items-center gap-3 overflow-hidden rounded-xl py-2.5 pl-[17px] pr-3 text-[13.5px] transition-all duration-150 active:scale-[0.98]",
                    active
                      ? "bg-[#007AFF]/[0.14] font-semibold text-[#0055CC] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_8px_-2px_rgba(0,122,255,0.18)] ring-1 ring-[#007AFF]/15"
                      : "font-medium text-[#1D1D1F]/85 hover:bg-white/55 hover:text-[#1D1D1F] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
                  ].join(" ")}
                >
                  <Icon
                    strokeWidth={active ? 2 : 1.75}
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      active
                        ? "text-[#007AFF]"
                        : "text-[#525257] group-hover:text-[#1D1D1F]"
                    }`}
                  />
                  <span
                    className={`whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none ${
                      isVisuallyCollapsed ? "lg:opacity-0" : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: Demo badge, profile & collapse control */}
      <div className="relative z-10 flex shrink-0 flex-col border-t border-white/55 p-3 shadow-[0_-1px_0_rgba(15,23,42,0.05)]">
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
            isVisuallyCollapsed ? "lg:grid-rows-[0fr] lg:opacity-0" : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-1 pb-2.5 whitespace-nowrap">
              <DemoBadge label="Demo mode · simulated" />
            </div>
          </div>
        </div>

        {currentUser ? (
          <Link
            href="/profile"
            onClick={onNavigate}
            className="flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/65 bg-white/55 py-2 pl-[12px] pr-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_4px_rgba(15,23,42,0.05)] transition-colors hover:bg-white/80"
            title={`${currentUser.name} · ${USER_ROLE_LABELS[currentUser.role]}`}
          >
            <UserAvatar
              initials={currentUser.initials}
              color={currentUser.avatarColor}
              size="sm"
            />
            <div
              className={`min-w-0 flex-1 whitespace-nowrap leading-tight transition-opacity duration-200 motion-reduce:transition-none ${
                isVisuallyCollapsed ? "lg:opacity-0" : "opacity-100"
              }`}
            >
              <p className="truncate text-[12.5px] font-semibold text-[#1D1D1F]">
                {currentUser.name}
              </p>
              <p className="truncate text-[11px] text-[#525257]">
                {USER_ROLE_LABELS[currentUser.role]}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/65 bg-white/50 py-2 pl-[12px] pr-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_4px_rgba(15,23,42,0.04)] transition-colors hover:bg-white/80"
            title="Sign in or register to track reports and votes"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#007AFF]/[0.12] text-[#007AFF]">
              <LogIn className="h-3.5 w-3.5" />
            </span>
            <div
              className={`min-w-0 flex-1 whitespace-nowrap leading-tight transition-opacity duration-200 motion-reduce:transition-none ${
                isVisuallyCollapsed ? "lg:opacity-0" : "opacity-100"
              }`}
            >
              <p className="truncate text-[12.5px] font-semibold text-[#1D1D1F]">
                Sign in / Register
              </p>
              <p className="truncate text-[11px] text-[#525257]">
                Track reports &amp; votes
              </p>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={handleToggleClick}
          className="mt-2.5 hidden w-full items-center gap-3 overflow-hidden rounded-xl py-2 pl-[18px] pr-3 text-[12.5px] font-medium text-[#525257] transition-all hover:bg-white/55 hover:text-[#1D1D1F] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] lg:flex cursor-pointer"
          aria-label={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
          title={
            collapsed
              ? isVisuallyCollapsed
                ? "Expand and pin sidebar"
                : "Pin sidebar open"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <>
              <PanelLeftOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span
                className={`whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none ${
                  isVisuallyCollapsed ? "lg:opacity-0" : "opacity-100"
                }`}
              >
                Pin sidebar
              </span>
            </>
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="whitespace-nowrap">Collapse sidebar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="mt-2.5 w-full rounded-xl bg-black/[0.05] px-3 py-2 text-[13px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.08] lg:hidden cursor-pointer"
        >
          Close menu
        </button>
      </div>
    </aside>
  );
}
