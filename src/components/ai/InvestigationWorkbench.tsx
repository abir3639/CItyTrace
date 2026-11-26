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
import { PrintDossierButton } from "@/components/ui/ExportActions";
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

const FEATURED_EXAMPLES: {
  projectId: string;
  code: string;
  title: string;
  subtitle: string;
  tone: "danger" | "warn" | "ok";
  badge: string;
}[] = [
  {
    projectId: "P-R01",
    code: "CT-DH-R01",
    title: "Recurring Road Failure",
    subtitle: "3 repairs on Begum Rokeya Link Road · 96.9% spent vs. 35% built",
    tone: "danger",
    badge: "Recurrence + Gap",
  },
  {
    projectId: "P-WTR06",
    code: "CT-DH-W06",
    title: "Unverified Expenditure",
    subtitle: "BDT 39.8M (97.1%) reported spent on Canal West with 0 verified",
    tone: "warn",
    badge: "Missing audit",
  },
  {
    projectId: "P-L03",
    code: "CT-DH-L03",
    title: "Clean Delivery Benchmark",
    subtitle: "Smart LED corridor finished early · 100% verified spend",
    tone: "ok",
    badge: "Calibrated control",
  },
];

export default function InvestigationWorkbench({
  initialProjectId = null,
  initialReport = null,
}: {
  initialProjectId?: string | null;
  initialReport?: InvestigationReport | null;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    initialProjectId ?? PROJECTS[0].id
  );
  const [reports, setReports] = useState<Record<string, InvestigationReport>>(() =>
    initialReport ? { [initialReport.caseId]: initialReport } : {}
  );
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

  const run = async (targetProjectId?: string) => {
    const id = targetProjectId ?? selected.id;
    if (targetProjectId && targetProjectId !== selectedId) {
      setSelectedId(targetProjectId);
    }
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
      `CityTrace civic investigation — ${selected.code} ${selected.name}`,
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

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {FEATURED_EXAMPLES.map((example) => {
          const isSelected = selected.id === example.projectId;
          return (
            <button
              key={example.projectId}
              type="button"
              onClick={() => void run(example.projectId)}
              disabled={loadingId === example.projectId}
              className={`group ct-surface flex flex-col gap-2 rounded-[18px] p-4 text-left transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 ${
                isSelected
                  ? "ring-2 ring-[#007AFF]"
                  : "hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                  {example.code}
                </span>
                <Badge tone={example.tone} dot>
                  {example.badge}
                </Badge>
              </div>
              <p className="text-[14px] font-semibold text-[#1D1D1F] group-hover:text-[#007AFF]">
                {example.title}
              </p>
              <p className="text-[12.5px] leading-relaxed text-[#6E6E73]">
                {example.subtitle}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[12px] font-semibold text-[#007AFF]">
                <Sparkles className="h-3.5 w-3.5" /> Run investigation
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Record selector */}
        <Panel className="flex flex-col overflow-hidden p-0 xl:col-span-1">
          <div className="border-b border-black/[0.06] px-4 py-3.5">
            <PanelHeader
              title="Select a Record"
              description="Ten sanctioned works available for audit."
              icon={<FileSearch className="h-4 w-4" />}
            />
          </div>
          <ul className="ct-scroll max-h-[70vh] divide-y divide-black/[0.05] overflow-y-auto">
            {PROJECTS.map((project) => {
              const active = project.id === selected.id;
              const analysed = Boolean(reports[project.id]);
              const projectSector = getSector(project.sectorId);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(project.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors cursor-pointer ${
                      active ? "bg-[#007AFF]/[0.08]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                        {project.code}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {analysed ? (
                          <Check className="h-3.5 w-3.5 text-[#34C759]" aria-label="Report available" />
                        ) : null}
                        <Badge tone={projectStatusTone(project.status)}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                      </span>
                    </span>
                    <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#1D1D1F]">
                      {project.name}
                    </span>
                    <span className="text-[11.5px] text-[#6E6E73] tabular-nums">
                      {projectSector?.code ?? project.sectorId} · {formatBdtCompact(project.allocatedBudgetBdt)} ·{" "}
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
          <Panel glow className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-0.5 text-[12px] font-semibold text-[#0055CC] tabular-nums">
                    {selected.code}
                  </span>
                  <Badge tone={projectStatusTone(selected.status)} dot>
                    {PROJECT_STATUS_LABELS[selected.status]}
                  </Badge>
                  {overdue > 0 ? <Badge tone="warn">{overdue}d overdue</Badge> : null}
                </div>
                <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] leading-snug text-[#1D1D1F]">
                  {selected.name}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-[#6E6E73]">{selected.authority}</p>
              </div>

              <button
                type="button"
                onClick={() => void run()}
                disabled={isLoading}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {report ? "Re-run investigation" : "Investigate"}
                  </>
                )}
              </button>
            </div>

            <div className="ct-surface-inset rounded-[16px] p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12.5px] text-[#48484A] tabular-nums">
                  {formatBdtCompact(budget.reported)} reported of{" "}
                  {formatBdtCompact(budget.allocated)} allocated
                </p>
                <p className="text-[13px] font-semibold text-[#0055CC] tabular-nums">
                  {formatPercent(budget.reportedPercent)}
                </p>
              </div>
              <div className="mt-1.5">
                <SpendBar
                  allocated={budget.allocated}
                  reported={budget.reported}
                  verified={budget.verified}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] tabular-nums">
                <span className="text-[#6E6E73]">
                  Verified physical progress {selected.verifiedProgressPercent}%
                </span>
                <span className={budget.verified === undefined ? TONES.warn.label : TONES.ok.label}>
                  {budget.verified === undefined
                    ? "No verified spend on file"
                    : `${formatBdtCompact(budget.verified)} verified`}
                </span>
              </div>
            </div>
          </Panel>

          {error && !isLoading ? (
            <Panel className="border-[#FF3B30]/25 bg-[#FF3B30]/[0.05] p-5">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-[#C9241B]">
                <AlertCircle className="h-4 w-4" /> Investigation failed
              </p>
              <p className="mt-1 text-[13px] text-[#48484A]">{error}</p>
              <button
                type="button"
                onClick={() => void run()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF3B30] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </Panel>
          ) : null}

          {!report && !isLoading && !error ? (
            <Panel className="p-5">
              <PanelHeader
                title="How the Engine Audits a Record"
                description="Every finding is derived directly from stored records."
                icon={<HelpCircle className="h-4 w-4" />}
              />
              <ul className="mt-3.5 space-y-2.5 text-[13px] leading-relaxed text-[#48484A]">
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#007AFF]" />
                  <span>
                    <strong className="text-[#1D1D1F]">Recurring problems</strong> — counts separate
                    issues recorded at the same physical location and the citizen reports behind them.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#007AFF]" />
                  <span>
                    <strong className="text-[#1D1D1F]">Schedule slip</strong> — compares each
                    milestone&apos;s planned date with what was actually recorded.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#007AFF]" />
                  <span>
                    <strong className="text-[#1D1D1F]">Spending anomalies</strong> — separates
                    reported expenditure from independently verified expenditure.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#007AFF]" />
                  <span>
                    <strong className="text-[#1D1D1F]">Evidence gaps</strong> — flags conclusions the
                    archive cannot currently support.
                  </span>
                </li>
              </ul>
              <p className="mt-4 rounded-[14px] border border-[#FF9500]/20 bg-[#FF9500]/[0.07] p-3 text-[12px] leading-relaxed text-[#B25000]">
                Findings describe record inconsistencies only. They are not allegations against any
                authority and require independent verification.
              </p>
            </Panel>
          ) : null}

          {isLoading ? (
            <Panel className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#007AFF]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
                Auditing {selected.code}…
              </div>
              {[92, 100, 84, 96, 70].map((width, index) => (
                <div
                  key={index}
                  className="ct-skeleton h-3 rounded-full"
                  style={{ width: `${width}%` }}
                />
              ))}
            </Panel>
          ) : null}

          {report && !isLoading ? (
            <Panel className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11.5px] font-medium ${
                    report.source === "gemini"
                      ? "bg-[#007AFF]/[0.1] text-[#0055CC]"
                      : "bg-black/[0.05] text-[#48484A]"
                  }`}
                >
                  {report.source === "gemini"
                    ? `Gemini live · ${report.model}`
                    : `Rules engine · ${report.model}`}
                </span>

                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      report.riskLevel === "HIGH"
                        ? "danger"
                        : report.riskLevel === "MEDIUM"
                          ? "warn"
                          : "ok"
                    }
                    dot
                  >
                    {report.riskLevel.charAt(0) + report.riskLevel.slice(1).toLowerCase()} risk
                  </Badge>
                  <span className="rounded-full bg-[#F5F5F7] px-2.5 py-0.5 text-[11.5px] font-medium text-[#48484A] tabular-nums">
                    {report.confidenceScore}% confidence
                  </span>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#F5F5F7] p-4">
                <h3 className="text-[16px] font-semibold tracking-[-0.015em] leading-snug text-[#1D1D1F]">
                  {report.headline}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#48484A]">
                  {report.executiveSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[14px] border border-black/[0.06] bg-white p-3.5">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
                    <Wrench className="h-3.5 w-3.5 text-[#007AFF]" /> Recurrence
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#48484A]">
                    {report.repairHistoryAnalysis}
                  </p>
                </div>
                <div className="rounded-[14px] border border-black/[0.06] bg-white p-3.5">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
                    <RefreshCw className="h-3.5 w-3.5 text-[#007AFF]" /> Schedule
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#48484A]">
                    {report.delayAnalysis}
                  </p>
                </div>
                <div className="rounded-[14px] border border-black/[0.06] bg-white p-3.5">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
                    <Coins className="h-3.5 w-3.5 text-[#007AFF]" /> Money
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#48484A]">
                    {report.budgetAnalysis}
                  </p>
                </div>
              </div>

              <div className="rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-4">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1D1D1F]">
                  <CalendarClock className="h-3.5 w-3.5 text-[#007AFF]" /> Timeline · Planned vs. recorded
                </p>
                <ol className="mt-2.5 space-y-1.5">
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
                      milestone.actualDate && milestone.status === "missed" ? " · late" : "";
                    return (
                      <li
                        key={milestone.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12.5px]"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-[#1D1D1F]">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                          <span className="truncate font-medium">{milestone.title}</span>
                        </span>
                        <span className="shrink-0 text-[#6E6E73] tabular-nums">
                          {formatDate(milestone.plannedDate)}
                          {milestone.actualDate
                            ? ` → ${formatDate(milestone.actualDate)}${late}`
                            : " → not recorded"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.07] p-4">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#B25000]">
                  <AlertCircle className="h-3.5 w-3.5" /> Observed inconsistencies
                </p>
                <ul className="mt-2 space-y-1.5">
                  {report.inconsistencies.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-[13px] text-[#1D1D1F]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF9500]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1D1D1F]">
                  <FileSearch className="h-3.5 w-3.5 text-[#007AFF]" /> Evidence ({report.evidenceCitations.length})
                </p>
                <div className="mt-2 space-y-2">
                  {report.evidenceCitations.map((citation, index) => (
                    <div
                      key={index}
                      className="rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#007AFF]/[0.1] px-2 py-0.5 text-[11px] font-semibold text-[#0055CC] tabular-nums">
                          {index + 1}
                        </span>
                        <span className="text-[12.5px] font-semibold text-[#1D1D1F]">
                          {citation.label}
                        </span>
                        {citation.recordRefs?.length ? (
                          <span className="ml-auto flex flex-wrap items-center gap-2">
                            {citation.recordRefs.map((ref) => {
                              const href = recordHref(ref);
                              return href ? (
                                <Link
                                  key={ref}
                                  href={href}
                                  className="text-[12px] font-medium text-[#007AFF] hover:underline tabular-nums"
                                >
                                  {ref}
                                </Link>
                              ) : (
                                <span key={ref} className="text-[12px] text-[#86868B] tabular-nums">
                                  {ref}
                                </span>
                              );
                            })}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#1D1D1F]">
                        {citation.fact}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#6E6E73]">
                        Why it matters: {citation.significance}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {report.missingInformation?.length ? (
                <div className="rounded-[14px] border border-black/[0.06] bg-[#F5F5F7] p-4">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1D1D1F]">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#FF9500]" /> Missing information
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {report.missingInformation.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-[12.5px] text-[#48484A]">
                        <span className="text-[#FF9500]">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-[14px] border border-black/[0.06] bg-[#F5F5F7] p-4">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1D1D1F]">
                  <CheckSquare className="h-3.5 w-3.5 text-[#007AFF]" /> Recommended verification steps
                </p>
                <ol className="mt-2 space-y-1.5">
                  {report.recommendedVerifySteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-[12.5px] text-[#48484A]">
                      <span className="font-semibold text-[#007AFF] tabular-nums">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="print-hidden flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={copySummary}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[12.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#34C759]" />
                      <span className="text-[#1A7F37]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#007AFF]" />
                      Copy summary
                    </>
                  )}
                </button>
                <PrintDossierButton label="Save dossier PDF" />
                <Link
                  href={`/public-projects/${selected.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[12.5px] font-semibold text-white transition-all hover:bg-[#0066D6]"
                >
                  Open project ledger <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Panel>
          ) : null}

          {report || isLoading ? null : (
            <Panel className="p-5">
              <PanelHeader
                title="Selected Record Snapshot"
                description="Figures read directly from the project dataset."
              />
              <dl className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
                <KeyValue label="Allocated" value={formatBdtCompact(selected.allocatedBudgetBdt)} />
                <KeyValue label="Reported" value={formatBdtCompact(selected.reportedExpenditureBdt)} />
                <KeyValue
                  label="Verified"
                  value={
                    selected.verifiedExpenditureBdt === undefined
                      ? "Missing"
                      : formatBdtCompact(selected.verifiedExpenditureBdt)
                  }
                  tone={selected.verifiedExpenditureBdt === undefined ? "warn" : "ok"}
                />
                <KeyValue label="Progress" value={`${selected.verifiedProgressPercent}%`} />
              </dl>
              <ProgressBar
                value={selected.verifiedProgressPercent}
                tone={projectStatusTone(selected.status)}
                className="mt-3"
                label={`${selected.verifiedProgressPercent} percent verified progress`}
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
