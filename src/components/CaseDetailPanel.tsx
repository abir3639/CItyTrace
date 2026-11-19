"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  History,
  MapPin,
  Wrench,
  X,
} from "lucide-react";
import type { InfraCase } from "@/types/citytrace";
import {
  formatBdt,
  formatBdtCompact,
  getStatusStyle,
} from "@/utils/formatters";

interface CaseDetailPanelProps {
  cases: InfraCase[];
  selectedCase: InfraCase | null;
  onSelectCase: (id: string) => void;
  onClearSelection: () => void;
}

type DetailTab = "all" | "repairs" | "timeline";

export default function CaseDetailPanel({
  cases,
  selectedCase,
  onSelectCase,
  onClearSelection,
}: CaseDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("all");

  if (!selectedCase) {
    return (
      <div className="ct-panel rounded-xl p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-cyan-400 uppercase">
            Infrastructure Inspector
          </span>
          <span className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-200">
            SIMULATED DEMO DATA
          </span>
        </div>

        <h2 className="text-lg font-semibold text-slate-50">
          Select a 3D City Marker to Begin
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
          Click any glowing marker in Dhaka Sector 04—or select one of the three
          tracked civic projects below—to inspect repair cycles, BDT spending,
          and project timelines.
        </p>

        <div className="mt-4 space-y-2.5">
          {cases.map((item) => {
            const st = getStatusStyle(item.status);
            const pctSpent = Math.round(
              (item.reportedExpenditureBdt / item.allocatedBudgetBdt) * 100
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectCase(item.id)}
                className="w-full rounded-xl border border-slate-800 bg-[#08101d]/90 p-3.5 text-left transition-all hover:border-cyan-400/50 hover:bg-[#0c182b] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${st.dotClass}`} />
                    <span className="font-mono text-[11px] font-semibold text-cyan-300">
                      {item.code}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${st.badgeBg} ${st.badgeText} ${st.badgeBorder}`}
                  >
                    {st.label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-100">
                  {item.projectName}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-400">
                  <span>{item.location.split(",")[0]}</span>
                  <span className="text-slate-200">
                    {formatBdtCompact(item.reportedExpenditureBdt)} /{" "}
                    {formatBdtCompact(item.allocatedBudgetBdt)} ({pctSpent}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const st = getStatusStyle(selectedCase.status);
  const spendRatio = Math.min(
    100,
    Math.round(
      (selectedCase.reportedExpenditureBdt / selectedCase.allocatedBudgetBdt) *
        1000
    ) / 10
  );

  const barColor =
    selectedCase.status === "Unresolved"
      ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
      : selectedCase.status === "Delayed"
        ? "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
        : "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]";

  const showRepairs = activeTab === "all" || activeTab === "repairs";
  const showTimeline = activeTab === "all" || activeTab === "timeline";

  return (
    <div className="ct-panel ct-panel-glow flex flex-col gap-4 rounded-xl p-5">
      {/* Top Status & Controls Row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
            {selectedCase.code}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${st.badgeBg} ${st.badgeText} ${st.badgeBorder}`}
          >
            <span className={`h-2 w-2 rounded-full ${st.dotClass}`} />
            {selectedCase.status}
          </span>
          <span className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-200">
            SIMULATED DEMO DATA
          </span>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          title="Return to Sector Overview"
          className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 cursor-pointer"
        >
          <X className="h-3 w-3" />
          <span>Overview</span>
        </button>
      </div>

      {/* Project Title, Location, Simulated Authority */}
      <div>
        <h2 className="text-base font-bold leading-snug text-slate-50 sm:text-lg">
          {selectedCase.projectName}
        </h2>
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span>{selectedCase.location}</span>
          </p>
          <p className="flex items-start gap-1.5 text-slate-400">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{selectedCase.authority}</span>
          </p>
        </div>
      </div>

      {/* Alert / Repeat-Repair Callout Banner */}
      {selectedCase.status === "Unresolved" ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/35 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="text-xs">
            <p className="font-semibold text-red-200">
              {selectedCase.repairCount} Past Repairs Detected — Recurring Road Damage
            </p>
            <p className="mt-0.5 text-red-300/85">
              This corridor has been repaired {selectedCase.repairCount} times
              with {spendRatio}% of allocated BDT exhausted while surface failure
              persists.
            </p>
          </div>
        </div>
      ) : selectedCase.status === "Delayed" ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2.5">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-xs">
            <p className="font-semibold text-amber-200">
              Schedule Exceeded · Planned Completion {selectedCase.plannedCompletionDate}
            </p>
            <p className="mt-0.5 text-amber-200/85">
              {selectedCase.actualOrCurrentStatusDate} —{" "}
              {selectedCase.verifiedProgressPercent}% physical completion vs{" "}
              {spendRatio}% funds disbursed.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="text-xs">
            <p className="font-semibold text-emerald-200">
              Completed Ahead of Target · Under Allocated Ceiling
            </p>
            <p className="mt-0.5 text-emerald-200/85">
              {selectedCase.actualOrCurrentStatusDate} with 100% verified grid
              delivery.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-3 gap-2">
        {selectedCase.keyMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-slate-800 bg-[#08111f] px-2.5 py-2"
          >
            <p className="font-mono text-[10px] text-slate-400 uppercase">
              {metric.label}
            </p>
            <p
              className={`mt-0.5 font-mono text-xs font-bold sm:text-sm ${
                metric.flag === "alert"
                  ? "text-red-300"
                  : metric.flag === "warn"
                    ? "text-amber-300"
                    : "text-emerald-300"
              }`}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Public Money Explorer (BDT) */}
      <div className="rounded-xl border border-cyan-500/20 bg-[#07101d] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">
            <Coins className="h-3.5 w-3.5 text-cyan-400" />
            <span>Public Money Ledger (BDT)</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-slate-200">
            {spendRatio}% Spent
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-mono text-[10px] text-slate-400 uppercase">
              Allocated Budget
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-slate-100">
              {formatBdt(selectedCase.allocatedBudgetBdt)}
            </p>
            <p className="font-mono text-[10px] text-slate-400">
              ({formatBdtCompact(selectedCase.allocatedBudgetBdt)})
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-slate-400 uppercase">
              Reported Expenditure
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-cyan-300">
              {formatBdt(selectedCase.reportedExpenditureBdt)}
            </p>
            <p className="font-mono text-[10px] text-slate-400">
              ({formatBdtCompact(selectedCase.reportedExpenditureBdt)})
            </p>
          </div>
        </div>

        {/* Spend Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${spendRatio}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
          <span>Planned Target: {selectedCase.plannedCompletionDate}</span>
          <span>Physical Progress: {selectedCase.verifiedProgressPercent}%</span>
        </div>
      </div>

      {/* Problem Description */}
      <div className="rounded-lg border border-slate-800/90 bg-[#08101c] p-3">
        <p className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Problem & Field Situation
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
          {selectedCase.problemDescription}
        </p>
      </div>

      {/* Interactive Section Filter Tabs */}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#070e1a] p-1">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === "all"
              ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Full Record
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("repairs")}
          className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === "repairs"
              ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Repairs ({selectedCase.repairHistory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === "timeline"
              ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Timeline ({selectedCase.timeline.length})
        </button>
      </div>

      {/* Previous Repair History */}
      {showRepairs && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">
              <Wrench className="h-3.5 w-3.5 text-cyan-400" />
              <span>Previous Repair & Work History</span>
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              {selectedCase.repairHistory.length} Records
            </span>
          </div>

          <div className="space-y-2">
            {selectedCase.repairHistory.map((rep) => (
              <div
                key={rep.id}
                className="rounded-lg border border-slate-800 bg-[#08101c] p-3"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                  <span className="font-semibold text-cyan-300">{rep.date}</span>
                  <span className="font-semibold text-slate-100">
                    {formatBdt(rep.costBdt)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-100">
                  {rep.summary}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {rep.outcome}
                </p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  Note: {rep.contractorNote}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Timeline */}
      {showTimeline && (
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">
            <History className="h-3.5 w-3.5 text-cyan-400" />
            <span>Chronological Timeline</span>
          </h3>

          <ol className="relative ml-2 space-y-3 border-l border-slate-700/80 pl-4">
            {selectedCase.timeline.map((ev, idx) => {
              const dotTone =
                ev.kind === "delay"
                  ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                  : ev.kind === "completed"
                    ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                    : ev.kind === "inspection"
                      ? "bg-red-400 shadow-[0_0_8px_#ef4444]"
                      : "bg-cyan-400 shadow-[0_0_8px_#22d3ee]";
              return (
                <li key={`${ev.date}-${idx}`} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-[#060b14] ${dotTone}`}
                  />
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{ev.date}</span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-100">
                    {ev.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                    {ev.detail}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
