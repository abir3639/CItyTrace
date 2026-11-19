"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckSquare,
  Coins,
  Copy,
  FileSearch,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { InfraCase, InvestigationReport } from "@/types/citytrace";

interface AiInvestigationPanelProps {
  selectedCase: InfraCase;
  report: InvestigationReport | null;
  isLoading: boolean;
  error: string | null;
  onInvestigate: () => void;
}

export default function AiInvestigationPanel({
  selectedCase,
  report,
  isLoading,
  error,
  onInvestigate,
}: AiInvestigationPanelProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCopied(false);
  }, [selectedCase.id]);

  useEffect(() => {
    if (report && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [report]);

  const handleCopySummary = async () => {
    if (!report) return;
    const text = [
      `CITYTRACE Civic Investigation Report (${report.source === "gemini" ? report.model : "PREWRITTEN DEMO FALLBACK"})`,
      `SIMULATED DEMO DATA — Fictional Municipal Audit Scenario`,
      `Case: ${selectedCase.code} — ${selectedCase.projectName}`,
      `Risk: ${report.riskLevel} | Confidence: ${report.confidenceScore}%`,
      `Headline: ${report.headline}`,
      `Summary: ${report.executiveSummary}`,
      `Inconsistencies:\n${report.inconsistencies.map((i) => `- ${i}`).join("\n")}`,
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked in insecure contexts; silently ignore
    }
  };

  const riskBadgeClass =
    report?.riskLevel === "HIGH"
      ? "border-red-500/45 bg-red-500/15 text-red-200"
      : report?.riskLevel === "MEDIUM"
        ? "border-amber-500/45 bg-amber-500/15 text-amber-200"
        : "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";

  return (
    <section
      ref={cardRef}
      aria-label="AI Civic Investigation Panel"
      className="ct-panel ct-panel-glow flex flex-col gap-3.5 rounded-xl p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/15">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase">
              AI Civic Investigation
            </h3>
            <p className="font-mono text-[10px] text-slate-400">
              Evidence-Bound Record Audit · {selectedCase.code}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-200">
          <ShieldAlert className="h-3 w-3" />
          SIMULATED DEMO DATA
        </span>
      </div>

      {/* Prompt + Primary Trigger when no report generated yet */}
      {!report && !isLoading && (
        <div className="rounded-lg border border-cyan-500/25 bg-[#07111f] p-3.5">
          <p className="text-xs leading-relaxed text-slate-300">
            Run an automated audit on{" "}
            <span className="font-semibold text-slate-100">
              {selectedCase.markerLabel}
            </span>{" "}
            to examine repair frequency, schedule adherence, and BDT spending
            ratios strictly from the recorded project timeline.
          </p>

          <button
            type="button"
            onClick={onInvestigate}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/60 bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2.5 font-mono text-xs font-bold tracking-wider text-slate-950 uppercase shadow-[0_0_24px_-4px_rgba(34,211,238,0.65)] transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Investigate with AI</span>
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex flex-col items-center gap-2.5 rounded-lg border border-cyan-500/35 bg-[#07111f] px-4 py-5 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="font-mono text-xs font-semibold text-cyan-200">
            Auditing {selectedCase.code} Financial & Repair Timeline...
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            Checking BDT disbursements, repeated repair logs, and handover variance
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/35 p-3 text-xs text-red-200">
          <p className="font-semibold">Investigation Request Failed</p>
          <p className="mt-1 text-red-200/85">{error}</p>
          <button
            type="button"
            onClick={onInvestigate}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-red-400/50 bg-red-500/20 px-3 py-1.5 font-mono text-[11px] font-semibold text-red-100 hover:bg-red-500/30 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry AI Investigation</span>
          </button>
        </div>
      )}

      {/* Generated Investigation Report */}
      {report && !isLoading && (
        <div className="flex flex-col gap-3">
          {/* Source + Risk Telemetry Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {report.source === "gemini" ? (
              <span className="rounded-full border border-cyan-400/45 bg-cyan-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-200">
                GEMINI LIVE ANALYSIS · {report.model}
              </span>
            ) : (
              <span className="rounded-full border border-amber-400/45 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-200">
                PREWRITTEN DEMO INVESTIGATION · NO API KEY CONFIGURED
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${riskBadgeClass}`}
              >
                RISK: {report.riskLevel}
              </span>
              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-200">
                {report.confidenceScore}% Match
              </span>
            </div>
          </div>

          {/* Headline & Executive Summary */}
          <div className="rounded-lg border border-cyan-500/25 bg-[#07111f] p-3.5">
            <h4 className="text-sm font-bold leading-snug text-cyan-100">
              {report.headline}
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
              {report.executiveSummary}
            </p>
          </div>

          {/* Three Structured Audit Pillars */}
          <div className="space-y-2">
            <div className="rounded-lg border border-slate-800 bg-[#08101d] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                <Wrench className="h-3.5 w-3.5 text-cyan-400" />
                <span>Repair History Analysis</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {report.repairHistoryAnalysis}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#08101d] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                <CalendarClock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Schedule & Delay Analysis</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {report.delayAnalysis}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#08101d] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                <Coins className="h-3.5 w-3.5 text-cyan-400" />
                <span>BDT Budget & Expenditure Analysis</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {report.budgetAnalysis}
              </p>
            </div>
          </div>

          {/* Potential Inconsistencies */}
          <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>Highlighted Record Inconsistencies</span>
            </p>
            <ul className="mt-1.5 space-y-1.5 text-xs text-slate-200">
              {report.inconsistencies.map((item, idx) => (
                <li key={`inc-${idx}`} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidence Citations */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
              <FileSearch className="h-3.5 w-3.5 text-cyan-400" />
              <span>Supporting Case Evidence ({report.evidenceCitations.length})</span>
            </p>
            <div className="space-y-2">
              {report.evidenceCitations.map((ev, idx) => (
                <div
                  key={`cit-${idx}`}
                  className="rounded-lg border border-slate-800 bg-[#07101c] p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                      [{idx + 1}]
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-100">
                      {ev.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                    {ev.fact}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-cyan-300/90">
                    Why it matters: {ev.significance}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Next Steps */}
          <div className="rounded-lg border border-slate-800 bg-[#08101c] p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
              <CheckSquare className="h-3.5 w-3.5 text-cyan-400" />
              <span>Objective Verification Steps</span>
            </p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-slate-300">
              {report.recommendedVerifySteps.map((step, idx) => (
                <li key={`step-${idx}`} className="flex items-start gap-1.5">
                  <span className="font-mono text-cyan-400">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onInvestigate}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-run AI Investigation</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-[11px] text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Copy Audit Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
