import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, FileWarning, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { KeyValue, ProgressBar, SpendBar } from "@/components/ui/Data";
import {
  CategoryBudgetChart,
  OverdueDaysChart,
  ProjectStatusChart,
  SpendComparisonChart,
} from "@/components/money/MoneyCharts";
import { PROJECTS, getSector } from "@/data";
import { listIssues } from "@/lib/issue-store";
import { CATEGORY_LABELS, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/types/citytrace";
import {
  getBlockedProjects,
  getBudgetTotals,
  getCategoryStats,
  getProjectOverdueDays,
} from "@/lib/stats";
import {
  TONES,
  formatBdt,
  formatBdtCompact,
  formatPercent,
  projectStatusTone,
} from "@/utils/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Money Tracker · CITYTRACE",
};

export default function MoneyTrackerPage() {
  // The live issue list includes citizen reports, so linked-issue counts match
  // the register exactly.
  const issues = listIssues();

  const totals = getBudgetTotals(PROJECTS);
  const missingVerification = PROJECTS.filter(
    (project) => project.verifiedExpenditureBdt === undefined
  );

  const shortCode = (code: string) => code.replace(/^CT-DH-/, "");

  const spendRows = PROJECTS.map((project) => ({
    code: shortCode(project.code),
    name: project.name,
    allocated: project.allocatedBudgetBdt,
    reported: project.reportedExpenditureBdt,
    verified: project.verifiedExpenditureBdt ?? 0,
  }));

  const categoryRows = getCategoryStats(issues).map((row) => ({
    label: CATEGORY_LABELS[row.category],
    allocated: row.allocatedBdt,
    reported: row.reportedBdt,
  }));

  const statusOrder: ProjectStatus[] = ["completed", "active", "planned", "delayed", "stalled"];
  const statusRows = statusOrder.map((status) => ({
    status: PROJECT_STATUS_LABELS[status],
    count: PROJECTS.filter((project) => project.status === status).length,
  }));

  const overdueRows = getBlockedProjects().map((project) => ({
    code: shortCode(project.code),
    name: project.name,
    days: getProjectOverdueDays(project),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Public Money Explorer"
        title="Where the public money went"
        description="Three numbers matter here, and they are never merged: the allocation sanctioned, the expenditure the executing office reports, and the expenditure independent evidence actually supports."
        actions={
          <Link
            href="/public-projects"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            Project list <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel glow className="flex flex-col gap-3 p-4 xl:col-span-2">
          <PanelHeader
            title="District Ledger"
            description="All ten sanctioned works combined."
            icon={<Wallet className="h-3.5 w-3.5" />}
          />

          <div className="rounded-lg border border-slate-800 bg-[#07101d] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[11px] text-slate-400">
                {formatBdt(totals.reportedBdt)} reported against{" "}
                {formatBdt(totals.allocatedBdt)} allocated
              </p>
              <p className="font-mono text-sm font-bold text-cyan-200">
                {formatPercent(totals.reportedUtilisationPercent)}
              </p>
            </div>
            <SpendBar
              allocated={totals.allocatedBdt}
              reported={totals.reportedBdt}
              verified={totals.verifiedBdt}
              height="h-3.5"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="ct-hatch h-2 w-2 rounded-sm" /> Reported, unverified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-700" /> Unspent
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-[#08101d] px-3 py-2">
              <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Allocated</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-100">
                {formatBdtCompact(totals.allocatedBdt)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#08101d] px-3 py-2">
              <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Reported</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-cyan-300">
                {formatBdtCompact(totals.reportedBdt)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#08101d] px-3 py-2">
              <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Verified</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-emerald-300">
                {formatBdtCompact(totals.verifiedBdt)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-2">
              <p className="font-mono text-[9px] tracking-wider text-amber-300/80 uppercase">
                Unverified
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-amber-300">
                {formatBdtCompact(totals.unverifiedBdt)}
              </p>
            </div>
          </dl>

          <p className="font-mono text-[10px] leading-relaxed text-slate-500">
            Unverified spend is the difference between what the executing office
            reports and what independent evidence supports. It is not proof of
            wrongdoing — it is money without a paper trail in this dataset.
          </p>
        </Panel>

        <Panel className="flex flex-col gap-3 p-4">
          <PanelHeader
            title="Missing Financial Evidence"
            description="Works where reported spend has no independent verification."
            icon={<FileWarning className="h-3.5 w-3.5" />}
          />

          <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 p-3">
            <p className="font-mono text-[10px] tracking-wider text-amber-300/80 uppercase">
              Projects affected
            </p>
            <p className="mt-0.5 font-mono text-2xl font-bold text-amber-300">
              {missingVerification.length}
              <span className="text-sm text-amber-300/60"> / {totals.projectsTotal}</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-100/80">
              These works are reported as spent but carry no independently verified
              financial record in the archive.
            </p>
          </div>

          <ul className="space-y-2">
            {missingVerification.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/public-projects/${project.id}`}
                  className="block rounded-lg border border-slate-800 bg-[#08101d] p-2.5 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold text-cyan-300">
                      {project.code}
                    </span>
                    <Badge tone={projectStatusTone(project.status)}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold text-slate-100">
                    {project.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-amber-300">
                    {formatBdtCompact(project.reportedExpenditureBdt)} reported · no verification
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-4">
          <PanelHeader
            title="Allocation vs spend"
            description="Every project: sanctioned ceiling, reported spend, verified spend."
            icon={<Coins className="h-3.5 w-3.5" />}
          />
          <div className="mt-3">
            <SpendComparisonChart data={spendRows} />
          </div>
        </Panel>

        <Panel className="p-4">
          <PanelHeader
            title="Allocation by category"
            description="Where the sanctioned money is concentrated."
            icon={<Wallet className="h-3.5 w-3.5" />}
          />
          <div className="mt-3">
            <CategoryBudgetChart data={categoryRows} />
          </div>
        </Panel>

        <Panel className="p-4">
          <PanelHeader
            title="Delivery status"
            description="How the ten works are tracking."
            icon={<ArrowRight className="h-3.5 w-3.5" />}
          />
          <div className="mt-3">
            <ProjectStatusChart data={statusRows} />
          </div>
        </Panel>

        <Panel className="p-4">
          <PanelHeader
            title="Delay exposure"
            description="Days past the contracted completion date, per delayed work."
            icon={<FileWarning className="h-3.5 w-3.5" />}
          />
          <div className="mt-3">
            <OverdueDaysChart data={overdueRows} />
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-800 px-4 py-3">
          <PanelHeader
            title="Project Ledger"
            description="Allocation, reported and verified spend for every sanctioned work."
            icon={<Coins className="h-3.5 w-3.5" />}
          />
        </div>
        <div className="ct-scroll overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0a1421] font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                <th className="px-4 py-2 font-semibold">Project</th>
                <th className="px-3 py-2 font-semibold">Authority</th>
                <th className="px-3 py-2 text-right font-semibold">Allocated</th>
                <th className="px-3 py-2 text-right font-semibold">Reported</th>
                <th className="px-3 py-2 text-right font-semibold">Verified</th>
                <th className="px-3 py-2 font-semibold">Utilisation</th>
                <th className="px-3 py-2 font-semibold">Physical</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((project) => {
                const sector = getSector(project.sectorId);
                const relatedIssues = issues.filter(
                  (issue) => issue.projectId === project.id
                );
                const overdue = getProjectOverdueDays(project);
                const reportedPct =
                  (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100;

                return (
                  <tr
                    key={project.id}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-2.5 align-top">
                      <Link
                        href={`/public-projects/${project.id}`}
                        className="font-mono text-[10px] font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        {project.code}
                      </Link>
                      <p className="mt-0.5 max-w-[20rem] text-[11px] font-semibold leading-snug text-slate-100">
                        {project.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                        {sector?.code ?? project.sectorId} · {relatedIssues.length} linked issues
                        {overdue > 0 ? ` · ${overdue}d overdue` : ""}
                      </p>
                    </td>
                    <td className="max-w-[14rem] px-3 py-2.5 align-top font-mono text-[10px] leading-snug text-slate-400">
                      {project.authority}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-mono text-[10px] text-slate-200">
                      {formatBdtCompact(project.allocatedBudgetBdt)}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-mono text-[10px] text-cyan-200">
                      {formatBdtCompact(project.reportedExpenditureBdt)}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-mono text-[10px]">
                      {project.verifiedExpenditureBdt === undefined ? (
                        <span className={TONES.warn.label}>missing</span>
                      ) : (
                        <span className="text-emerald-300">
                          {formatBdtCompact(project.verifiedExpenditureBdt)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="w-32">
                        <SpendBar
                          allocated={project.allocatedBudgetBdt}
                          reported={project.reportedExpenditureBdt}
                          verified={project.verifiedExpenditureBdt}
                          height="h-1.5"
                        />
                        <p className="mt-1 font-mono text-[9px] text-slate-400">
                          {formatPercent(reportedPct, 0)} reported
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="w-24">
                        <ProgressBar
                          value={project.verifiedProgressPercent}
                          tone={projectStatusTone(project.status)}
                          className="h-1.5"
                          label={`${project.verifiedProgressPercent} percent verified progress`}
                        />
                        <p className="mt-1 font-mono text-[9px] text-slate-400">
                          {project.verifiedProgressPercent}%
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="p-4">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <KeyValue
            label="Projects with verified spend"
            value={`${totals.projectsWithVerifiedSpend} / ${totals.projectsTotal}`}
            tone={totals.projectsWithVerifiedSpend === totals.projectsTotal ? "ok" : "warn"}
          />
          <KeyValue
            label="Verified share of allocation"
            value={formatPercent(totals.verifiedUtilisationPercent)}
            tone="ok"
          />
          <KeyValue
            label="Reported share of allocation"
            value={formatPercent(totals.reportedUtilisationPercent)}
            tone="warn"
          />
        </dl>
      </Panel>
    </div>
  );
}
