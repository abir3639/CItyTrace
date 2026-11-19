"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import HeaderBar from "@/components/HeaderBar";
import CaseDetailPanel from "@/components/CaseDetailPanel";
import AiInvestigationPanel from "@/components/AiInvestigationPanel";
import casesData from "@/data/cases.json";
import type { InfraCase, InvestigationReport } from "@/types/citytrace";
import { formatBdtCompact, getStatusStyle } from "@/utils/formatters";

const CASES = casesData as InfraCase[];
const SELECTED_CASE_STORAGE_KEY = "citytrace.selectedCaseId";
const REPORT_CACHE_PREFIX = "citytrace.aiReport.";

const CityScene = dynamic(() => import("@/components/CityScene"), {
  ssr: false,
  loading: () => (
    <div className="ct-panel flex h-[430px] w-full items-center justify-center rounded-xl sm:h-[520px] lg:h-[calc(100vh-148px)] lg:min-h-[540px]">
      <div className="flex flex-col items-center gap-2 font-mono text-xs text-cyan-300">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <span>Initializing 3D Sector Geometry...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);

  const [reportsByCase, setReportsByCase] = useState<
    Record<string, InvestigationReport>
  >({});
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [errorByCase, setErrorByCase] = useState<Record<string, string | null>>(
    {}
  );

  // Restore last selected marker and cached AI investigation reports from localStorage
  useEffect(() => {
    try {
      const savedId = window.localStorage.getItem(SELECTED_CASE_STORAGE_KEY);
      if (savedId && CASES.some((c) => c.id === savedId)) {
        setSelectedCaseId(savedId);
      }

      const cachedReports: Record<string, InvestigationReport> = {};
      for (const item of CASES) {
        const raw = window.localStorage.getItem(`${REPORT_CACHE_PREFIX}${item.id}`);
        if (raw) {
          cachedReports[item.id] = JSON.parse(raw) as InvestigationReport;
        }
      }
      if (Object.keys(cachedReports).length > 0) {
        setReportsByCase(cachedReports);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setAutoRotate(false);
    try {
      window.localStorage.setItem(SELECTED_CASE_STORAGE_KEY, id);
    } catch {
      // Ignore storage errors
    }
  };

  const handleClearSelection = () => {
    setSelectedCaseId(null);
    setResetSignal((prev) => prev + 1);
    try {
      window.localStorage.removeItem(SELECTED_CASE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleResetView = () => {
    setResetSignal((prev) => prev + 1);
  };

  const handleInvestigate = async (caseId: string) => {
    setLoadingCaseId(caseId);
    setErrorByCase((prev) => ({ ...prev, [caseId]: null }));

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });

      const payload = (await response.json()) as
        | InvestigationReport
        | { error?: string };

      if (!response.ok || !("headline" in payload)) {
        const message =
          "error" in payload && payload.error
            ? payload.error
            : `Server returned HTTP ${response.status}`;
        setErrorByCase((prev) => ({ ...prev, [caseId]: message }));
        return;
      }

      setReportsByCase((prev) => ({ ...prev, [caseId]: payload }));
      try {
        window.localStorage.setItem(
          `${REPORT_CACHE_PREFIX}${caseId}`,
          JSON.stringify(payload)
        );
      } catch {
        // Ignore storage write limits
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error during AI request";
      setErrorByCase((prev) => ({ ...prev, [caseId]: message }));
    } finally {
      setLoadingCaseId((current) => (current === caseId ? null : current));
    }
  };

  const selectedCase = useMemo(
    () => CASES.find((c) => c.id === selectedCaseId) ?? null,
    [selectedCaseId]
  );

  return (
    <div className="ct-grid-backdrop flex min-h-screen flex-col">
      <HeaderBar
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
        onResetView={handleResetView}
        activeMarkerCount={CASES.length}
      />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-4 p-4 lg:grid lg:grid-cols-12 lg:items-start lg:p-6">
        {/* Left/Center: 3D City Explorer + 3-Case Quick Switcher */}
        <section className="flex flex-col gap-3 lg:col-span-7 xl:col-span-8">
          <CityScene
            cases={CASES}
            selectedCaseId={selectedCaseId}
            onSelectCase={handleSelectCase}
            autoRotate={autoRotate}
            resetSignal={resetSignal}
          />

          {/* Three selectable sample case quick-switcher bar */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {CASES.map((item) => {
              const st = getStatusStyle(item.status);
              const active = item.id === selectedCaseId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectCase(item.id)}
                  className={`ct-panel flex flex-col gap-1 rounded-xl p-3 text-left transition-all cursor-pointer ${
                    active
                      ? "ct-panel-glow border-cyan-400/60 bg-[#0d1d33]"
                      : "hover:border-cyan-500/40 hover:bg-[#0c1626]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-slate-300">
                      <span className={`h-2 w-2 rounded-full ${st.dotClass}`} />
                      {item.code}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${st.badgeBg} ${st.badgeText} ${st.badgeBorder}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs font-semibold text-slate-100">
                    {item.markerLabel}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400">
                    Spent {formatBdtCompact(item.reportedExpenditureBdt)} /{" "}
                    {formatBdtCompact(item.allocatedBudgetBdt)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Information Panel + AI Civic Investigation Panel */}
        <aside className="ct-scroll flex flex-col gap-4 lg:col-span-5 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pr-1 xl:col-span-4">
          <CaseDetailPanel
            cases={CASES}
            selectedCase={selectedCase}
            onSelectCase={handleSelectCase}
            onClearSelection={handleClearSelection}
          />

          {selectedCase && (
            <AiInvestigationPanel
              selectedCase={selectedCase}
              report={reportsByCase[selectedCase.id] ?? null}
              isLoading={loadingCaseId === selectedCase.id}
              error={errorByCase[selectedCase.id] ?? null}
              onInvestigate={() => handleInvestigate(selectedCase.id)}
            />
          )}
        </aside>
      </main>
    </div>
  );
}
