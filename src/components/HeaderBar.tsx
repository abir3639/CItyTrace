"use client";

import { Activity, Pause, Play, RotateCcw, ShieldAlert } from "lucide-react";

interface HeaderBarProps {
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetView: () => void;
  activeMarkerCount?: number;
}

export default function HeaderBar({
  autoRotate,
  onToggleAutoRotate,
  onResetView,
  activeMarkerCount = 3,
}: HeaderBarProps) {
  return (
    <header className="ct-panel sticky top-0 z-30 border-x-0 border-t-0 border-b border-cyan-500/20 bg-[#070d18]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-950/50 shadow-[0_0_20px_-4px_rgba(34,211,238,0.45)]">
            <svg
              viewBox="0 0 36 36"
              fill="none"
              className="h-6 w-6 text-cyan-300"
              aria-hidden="true"
            >
              <path
                d="M18 3L31 10.5V25.5L18 33L5 25.5V10.5L18 3Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <circle
                cx="18"
                cy="18"
                r="5.5"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="2.5 2"
              />
              <circle cx="18" cy="18" r="2.2" fill="#22d3ee" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold tracking-[0.2em] text-slate-50 sm:text-lg">
                CITY<span className="text-cyan-400">TRACE</span>
              </h1>
              <span className="hidden rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-cyan-300 sm:inline-block">
                DHAKA SECTOR 04
              </span>
            </div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
              The Truth Behind Every Street
            </p>
          </div>
        </div>

        {/* Center: Required SIMULATED DEMO DATA badge */}
        <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 shadow-[0_0_16px_-6px_rgba(245,158,11,0.45)]">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-amber-200">
            SIMULATED DEMO DATA
          </span>
        </div>

        {/* Right: Sector telemetry + working viewport controls */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-mono text-[11px] text-slate-300 xl:flex">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span>{activeMarkerCount} INFRASTRUCTURE MARKERS · BDT AUDIT</span>
          </div>

          <button
            type="button"
            onClick={onToggleAutoRotate}
            aria-pressed={autoRotate}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
              autoRotate
                ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200 shadow-[0_0_14px_-4px_rgba(34,211,238,0.4)]"
                : "border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
            }`}
          >
            {autoRotate ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>{autoRotate ? "Orbit: On" : "Orbit: Off"}</span>
          </button>

          <button
            type="button"
            onClick={onResetView}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 font-mono text-xs text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-950/50 hover:text-cyan-100 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
            <span>Reset View</span>
          </button>
        </div>
      </div>
    </header>
  );
}
