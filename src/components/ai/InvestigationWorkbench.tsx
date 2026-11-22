"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckSquare,
  Coins,
  Copy,
  FileSearch,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { KeyValue, ProgressBar, SpendBar } from "@/components/ui/Data";
import { PROJECTS, getSector } from "@/data";
import { PROJECT_STATUS_LABELS } from "@/types/citytrace";
import type { InvestigationReport } from "@/types/citytrace";
import { getBudgetFor, getProjectOverdueDays } from "@/lib/stats";
import { recordHref } from "@/lib/links";
import {
  TONES,
  formatBdtCompact,
  formatDate,
  formatPercent,
  projectStatusTone,
} from "@/utils/formatters";

export default function InvestigationWorkbench({
  initialProjectId = null,
}: {
  /** Deep link from a project record, e.g. `/ai-investigation?project=P-R01`. */
  initialProjectId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    initialProjectId ?? PROJECTS[0].id
  );
  const [reports, setReports] = useState<Record<string, InvestigationReport>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => PROJECTS.find((project) => project.id === selectedId) ?? PROJECTS[0],
    [selectedId]
  );
  const report = reports[selected.id] ?? null;
  const isLoading = loadingId === selected.id;
  const error = errors[selected.id] ?? null;

  const run = async () => {
    const id = selected.id;
    setLoadingId(id);
    setErrors((previous) => ({ ...previous, [id]: null }));

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const payload = (await response.json()) as InvestigationReport | { error?: string };

      if (!response.ok || !("headline" in payload)) {
        setErrors((previous) => ({
          ...previous,
          [id]:
            "error" in payload && payload.error
              ? payload.error
              : `Investigation failed with HTTP ${response.status}.`,
        }));
        return;
      }

      setReports((previous) => ({ ...previous, [id]: payload }));
    } catch (caught) {
      setErrors((previous) => ({
        ...previous,
        [id]: caught instanceof Error ? caught.message : "Network error during investigation.",
      }));
    } finally {
      setLoadingId((current) => (current === id ? null : current));
    }
  };

  const copySummary = async () => {
    if (!report) return;
    const text = [
      `CITYTRACE civic investigation — ${selected.code} ${selected.name}`,
      "SIMULATED DEMO DATA — fictional municipal audit scenario",
      `Risk: ${report.riskLevel} · Confidence: ${report.confidenceScore}% · Engine: ${report.model}`,
      `Finding: ${report.headline}`,
      `Summary: ${report.executiveSummary}`,
      `Inconsistencies:\n${report.inconsistencies.map((item) => `- ${item}`).join("\n")}`,
      `Verification steps:\n${report.recommendedVerifySteps.map((item) => `- ${item}`).join("\n")}`,
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked in insecure contexts.
    }
  };

  const budget = getBudgetFor(selected);
  const overdue = getProjectOverdueDays(selected);
  const sector = getSector(selected.sectorId);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Record selector */}
      <Panel className="flex flex-col p-0 xl:col-span-1">
        <div className="border-b border-slate-800 px-3.5 py-3">
          <PanelHeader
            title="Select a record"
            description="Ten sanctioned works are available for analysis."
            icon={<FileSearch className="h-3.5 w-3.5" />}
          />
        </div>
        <ul className="ct-scroll max-h-[70vh] divide-y divide-slate-800/70 overflow-y-auto">
          {PROJECTS.map((project) => {
            const active = project.id === selected.id;
            const analysed = Boolean(reports[project.id]);
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={`flex w-full flex-col gap-1 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                    active ? "bg-cyan-500/12" : "hover:bg-slate-800/50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold text-cyan-300">
                      {project.code}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {analysed ? (
                        <Check className="h-3 w-3 text-emerald-400" aria-label="Report available" />
                      ) : null}
                      <Badge tone={projectStatusTone(project.status)}>
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-100">
                    {project.name}
                  </span>
                  <span className="font-mono text-[9px] text-slate-500">
                    {sector?.code ?? project.sectorId} · {formatBdtCompact(project.allocatedBudgetBdt)} ·{" "}
                    {project.verifiedProgressPercent}% built
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Workbench */}
      <div className="flex flex-col gap-4 xl:col-span-2">
        <Panel glow className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  {selected.code}
                </span>
                <Badge tone={projectStatusTone(selected.status)} dot>
                  {PROJECT_STATUS_LABELS[selected.status]}
                </Badge>
                {overdue > 0 ? <Badge tone="warn">{overdue}d overdue</Badge> : null}
              </div>
              <h2 className="mt-1.5 text-sm font-bold leading-snug text-slate-50">
                {selected.name}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">{selected.authority}</p>
            </div>

            <button
              type="button"
              onClick={run}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-300/60 bg-gradient-to-r from-cyan-500 to-sky-500 px-3.5 py-2 font-mono text-[11px] font-bold tracking-wider text-slate-950 uppercase shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {report ? "Re-run investigation" : "Investigate"}
                </>
              )}
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#07101d] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] text-slate-400">
                {formatBdtCompact(budget.reported)} reported of{" "}
                {formatBdtCompact(budget.allocated)} allocated
              </p>
              <p className="font-mono text-[11px] font-semibold text-cyan-200">
                {formatPercent(budget.reportedPercent)}
              </p>
            </div>
            <SpendBar
              allocated={budget.allocated}
              reported={budget.reported}
              verified={budget.verified}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <span className="text-slate-400">
                Verified physical progress {selected.verifiedProgressPercent}%
              </span>
              <span
                className={
                  budget.verified === undefined ? TONES.warn.label : TONES.ok.label
                }
              >
                {budget.verified === undefined
                  ? "No verified spend on file"
                  : `${formatBdtCompact(budget.verified)} verified`}
              </span>
            </div>
          </div>
        </Panel>

        {error && !isLoading ? (
          <Panel className="border-red-500/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-200">
              <AlertCircle className="h-3.5 w-3.5" /> Investigation failed
            </p>
            <p className="mt-1 text-[11px] text-red-200/85">{error}</p>
            <button
              type="button"
              onClick={run}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-400/50 bg-red-500/20 px-3 py-1.5 font-mono text-[11px] text-red-100 hover:bg-red-500/30 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </Panel>
        ) : null}

        {!report && !isLoading && !error ? (
          <Panel className="p-4">
            <PanelHeader
              title="What the engine checks"
              description="Every finding is derived from the stored record — nothing is inferred from outside it."
              icon={<HelpCircle className="h-3.5 w-3.5" />}
            />
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span>
                  <strong className="text-slate-100">Recurring problems</strong> — counts separate
                  issues recorded at the same physical location and the citizen reports behind them.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span>
                  <strong className="text-slate-100">Schedule slip</strong> — compares each
                  milestone&apos;s planned date with what was actually recorded.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span>
                  <strong className="text-slate-100">Spending anomalies</strong> — separates
                  reported expenditure from independently verified expenditure and measures the gap.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span>
                  <strong className="text-slate-100">Evidence gaps</strong> — flags conclusions the
                  archive cannot currently support.
                </span>
              </li>
            </ul>
            <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/15 p-2.5 font-mono text-[10px] leading-relaxed text-amber-200/85">
              Findings describe record inconsistencies only. They are not allegations
              against any authority and require independent verification.
            </p>
          </Panel>
        ) : null}

        {isLoading ? (
          <Panel className="flex flex-col gap-2.5 p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-200">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              Auditing {selected.code}…
            </div>
            {[92, 100, 84, 96, 70].map((width, index) => (
              <div
                key={index}
                className="ct-skeleton h-2.5 rounded-full"
                style={{ width: `${width}%` }}
              />
            ))}
          </Panel>
        ) : null}

        {report && !isLoading ? (
          <Panel className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                  report.source === "gemini"
                    ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-600/60 bg-slate-500/15 text-slate-200"
                }`}
              >
                {report.source === "gemini"
                  ? `GEMINI LIVE ANALYSIS · ${report.model}`
                  : `RULES-ENGINE ANALYSIS · ${report.model}`}
              </span>

              <div className="flex items-center gap-1.5">
                <Badge
                  tone={
                    report.riskLevel === "HIGH"
                      ? "danger"
                      : report.riskLevel === "MEDIUM"
                        ? "warn"
                        : "ok"
                  }
                >
                  RISK: {report.riskLevel}
                </Badge>
                <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-200">
                  {report.confidenceScore}% confidence
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-cyan-500/25 bg-[#07111f] p-3">
              <h3 className="text-[13px] font-bold leading-snug text-cyan-100">
                {report.headline}
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200">
                {report.executiveSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-[#08101d] p-2.5">
                <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-cyan-300 uppercase">
                  <Wrench className="h-3 w-3" /> Recurrence
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {report.repairHistoryAnalysis}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#08101d] p-2.5">
                <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-cyan-300 uppercase">
                  <RefreshCw className="h-3 w-3" /> Schedule
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {report.delayAnalysis}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#08101d] p-2.5">
                <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-cyan-300 uppercase">
                  <Coins className="h-3 w-3" /> Money
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {report.budgetAnalysis}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#08101d] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-slate-300 uppercase">
                <CalendarClock className="h-3 w-3 text-cyan-400" /> Timeline · planned vs recorded
              </p>
              <ol className="mt-1.5 space-y-1">
                {selected.milestones.map((milestone) => {
                  const dot =
                    milestone.status === "met"
                      ? TONES.ok.dot
                      : milestone.status === "missed"
                        ? TONES.danger.dot
                        : milestone.status === "in-progress"
                          ? TONES.info.dot
                          : TONES.neutral.dot;
                  const late =
                    milestone.actualDate && milestone.status === "missed"
                      ? " · late"
                      : "";
                  return (
                    <li
                      key={milestone.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-mono text-[10px]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-slate-300">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        <span className="truncate">{milestone.title}</span>
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {formatDate(milestone.plannedDate)}
                        {milestone.actualDate ? ` → ${formatDate(milestone.actualDate)}${late}` : " → not recorded"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-amber-300 uppercase">
                <AlertCircle className="h-3 w-3" /> Observed inconsistencies
              </p>
              <ul className="mt-1.5 space-y-1">
                {report.inconsistencies.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-[11px] text-slate-200">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-cyan-300 uppercase">
                <FileSearch className="h-3 w-3" /> Evidence ({report.evidenceCitations.length})
              </p>
              <div className="mt-1.5 space-y-1.5">
                {report.evidenceCitations.map((citation, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-800 bg-[#07101c] p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                        [{index + 1}]
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-slate-100">
                        {citation.label}
                      </span>
                      {citation.recordRefs?.length ? (
                        <span className="ml-auto flex flex-wrap items-center gap-1.5">
                          {citation.recordRefs.map((ref) => {
                            const href = recordHref(ref);
                            return href ? (
                              <Link
                                key={ref}
                                href={href}
                                className="font-mono text-[9px] text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-100"
                              >
                                {ref}
                              </Link>
                            ) : (
                              <span key={ref} className="font-mono text-[9px] text-slate-500">
                                {ref}
                              </span>
                            );
                          })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                      {citation.fact}
                    </p>
                    <p className="mt-1 font-mono text-[9px] leading-relaxed text-cyan-300/80">
                      Why it matters: {citation.significance}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {report.missingInformation?.length ? (
              <div className="rounded-lg border border-slate-800 bg-[#08101c] p-3">
                <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-slate-300 uppercase">
                  <ShieldAlert className="h-3 w-3 text-amber-400" /> Missing information
                </p>
                <ul className="mt-1.5 space-y-1">
                  {report.missingInformation.map((item, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <span className="font-mono text-amber-400">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-800 bg-[#08101c] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-slate-300 uppercase">
                <CheckSquare className="h-3 w-3 text-cyan-400" /> Verification steps
              </p>
              <ol className="mt-1.5 space-y-1">
                {report.recommendedVerifySteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                    <span className="font-mono text-cyan-400">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={copySummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-[11px] text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-cyan-400" />
                    Copy summary
                  </>
                )}
              </button>
              <Link
                href={`/public-projects/${selected.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
              >
                Open project record <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Panel>
        ) : null}

        {report || isLoading ? null : (
          <Panel className="p-4">
            <PanelHeader
              title="Selected record snapshot"
              description="The engine reads exactly these figures."
            />
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              <KeyValue label="Allocated" value={formatBdtCompact(selected.allocatedBudgetBdt)} />
              <KeyValue label="Reported" value={formatBdtCompact(selected.reportedExpenditureBdt)} />
              <KeyValue
                label="Verified"
                value={
                  selected.verifiedExpenditureBdt === undefined
                    ? "missing"
                    : formatBdtCompact(selected.verifiedExpenditureBdt)
                }
                tone={selected.verifiedExpenditureBdt === undefined ? "warn" : "ok"}
              />
              <KeyValue label="Progress" value={`${selected.verifiedProgressPercent}%`} />
            </dl>
            <ProgressBar
              value={selected.verifiedProgressPercent}
              tone={projectStatusTone(selected.status)}
              className="mt-2"
              label={`${selected.verifiedProgressPercent} percent verified progress`}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
