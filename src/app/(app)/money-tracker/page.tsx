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
import {
  CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/types/citytrace";
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
  title: "Money Tracker · CityTrace",
};

export default function MoneyTrackerPage() {
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
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Public Money Explorer"
        title="Where Public Money Goes"
        description="Sanctioned allocation, reported expenditure, and independently verified spend are always separated — missing verification is never hidden."
        actions={
          <Link
            href="/public-projects"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-semibold text-[#007AFF] shadow-sm hover:bg-[#F9FAFB]"
          >
            Project list <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel glow className="flex flex-col gap-4 p-5 xl:col-span-2">
          <PanelHeader
            title="District Ledger"
            description="Combined financial position across all ten sanctioned works."
            icon={<Wallet className="h-4 w-4" />}
          />

          <div className="ct-surface-inset rounded-[16px] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-[#48484A] tabular-nums">
                {formatBdt(totals.reportedBdt)} reported against{" "}
                {formatBdt(totals.allocatedBdt)} allocated
              </p>
              <p className="text-[15px] font-semibold text-[#0055CC] tabular-nums">
                {formatPercent(totals.reportedUtilisationPercent)}
              </p>
            </div>
            <div className="mt-2">
              <SpendBar
                allocated={totals.allocatedBdt}
                reported={totals.reportedBdt}
                verified={totals.verifiedBdt}
                height="h-3.5"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[#6E6E73]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#34C759]" /> Verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="ct-hatch h-2.5 w-2.5 rounded-sm" /> Reported, unverified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" /> Unspent
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="ct-surface-inset rounded-[14px] px-3.5 py-2.5">
              <dt className="text-[11.5px] text-[#6E6E73]">Allocated</dt>
              <dd className="mt-0.5 text-[16px] font-semibold text-[#1D1D1F] tabular-nums">
                {formatBdtCompact(totals.allocatedBdt)}
              </dd>
            </div>
            <div className="ct-surface-inset rounded-[14px] px-3.5 py-2.5">
              <dt className="text-[11.5px] text-[#6E6E73]">Reported</dt>
              <dd className="mt-0.5 text-[16px] font-semibold text-[#0055CC] tabular-nums">
                {formatBdtCompact(totals.reportedBdt)}
              </dd>
            </div>
            <div className="ct-surface-inset rounded-[14px] px-3.5 py-2.5">
              <dt className="text-[11.5px] text-[#6E6E73]">Verified</dt>
              <dd className="mt-0.5 text-[16px] font-semibold text-[#1A7F37] tabular-nums">
                {formatBdtCompact(totals.verifiedBdt)}
              </dd>
            </div>
            <div className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.08] px-3.5 py-2.5">
              <dt className="text-[11.5px] text-[#B25000]">Unverified</dt>
              <dd className="mt-0.5 text-[16px] font-semibold text-[#B25000] tabular-nums">
                {formatBdtCompact(totals.unverifiedBdt)}
              </dd>
            </div>
          </dl>

          <p className="text-[12.5px] leading-relaxed text-[#6E6E73]">
            Unverified spend is the gap between executing-office reports and independent
            financial records. It indicates missing documentation rather than proof of
            wrongdoing.
          </p>
        </Panel>

        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title="Missing Financial Evidence"
            description="Projects with reported spend lacking independent verification."
            icon={<FileWarning className="h-4 w-4" />}
          />

          <div className="rounded-[16px] border border-[#FF9500]/25 bg-[#FF9500]/[0.08] p-4">
            <p className="text-[12px] font-medium text-[#B25000]">Projects affected</p>
            <p className="mt-1 text-[28px] font-semibold tracking-tight text-[#B25000] tabular-nums">
              {missingVerification.length}
              <span className="text-[16px] font-medium text-[#B25000]/70">
                {" "}
                / {totals.projectsTotal}
              </span>
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#48484A]">
              Reported as spent with no verified financial record attached.
            </p>
          </div>

          <ul className="space-y-2">
            {missingVerification.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/public-projects/${project.id}`}
                  className="block rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3 transition-colors hover:bg-[#F0F2F5]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                      {project.code}
                    </span>
                    <Badge tone={projectStatusTone(project.status)}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-[#1D1D1F]">
                    {project.name}
                  </p>
                  <p className="mt-1 text-[12px] text-[#B25000] tabular-nums">
                    {formatBdtCompact(project.reportedExpenditureBdt)} reported · no verification
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <PanelHeader
            title="Allocation vs. Spend"
            description="Sanctioned ceiling, reported spend, and verified spend by project."
            icon={<Coins className="h-4 w-4" />}
          />
          <div className="mt-4">
            <SpendComparisonChart data={spendRows} />
          </div>
        </Panel>

        <Panel className="p-5">
          <PanelHeader
            title="Allocation by Category"
            description="Distribution of sanctioned funds across infrastructure sectors."
            icon={<Wallet className="h-4 w-4" />}
          />
          <div className="mt-4">
            <CategoryBudgetChart data={categoryRows} />
          </div>
        </Panel>

        <Panel className="p-5">
          <PanelHeader
            title="Delivery Status"
            description="Current status distribution across all ten projects."
            icon={<ArrowRight className="h-4 w-4" />}
          />
          <div className="mt-4">
            <ProjectStatusChart data={statusRows} />
          </div>
        </Panel>

        <Panel className="p-5">
          <PanelHeader
            title="Delay Exposure"
            description="Days elapsed past the contracted completion date."
            icon={<FileWarning className="h-4 w-4" />}
          />
          <div className="mt-4">
            <OverdueDaysChart data={overdueRows} />
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-black/[0.06] px-5 py-4">
          <PanelHeader
            title="Project Ledger"
            description="Allocation, reported spend, and verified spend for every sanctioned work."
            icon={<Coins className="h-4 w-4" />}
          />
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-label="Project financial ledger table"
          className="ct-scroll overflow-x-auto"
        >
          <table className="w-full min-w-[1020px] border-collapse text-left">
            <caption className="sr-only">
              Financial ledger of all ten sanctioned works comparing allocated, reported, and verified spend
            </caption>
            <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
              <tr className="border-b border-black/[0.06] text-[12px] font-medium text-[#6E6E73]">
                <th scope="col" className="px-5 py-3">Project</th>
                <th scope="col" className="px-3 py-3">Authority</th>
                <th scope="col" className="px-3 py-3 text-right">Allocated</th>
                <th scope="col" className="px-3 py-3 text-right">Reported</th>
                <th scope="col" className="px-3 py-3 text-right">Verified</th>
                <th scope="col" className="px-3 py-3">Utilization</th>
                <th scope="col" className="px-5 py-3">Physical</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] bg-white">
              {PROJECTS.map((project) => {
                const sector = getSector(project.sectorId);
                const relatedIssues = issues.filter(
                  (issue) => issue.projectId === project.id
                );
                const overdue = getProjectOverdueDays(project);
                const reportedPct =
                  (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100;

                return (
                  <tr key={project.id} className="transition-colors hover:bg-[#F9FAFB]">
                    <th scope="row" className="px-5 py-3.5 align-top font-normal">
                      <Link
                        href={`/public-projects/${project.id}`}
                        className="text-[12px] font-semibold text-[#0055CC] hover:underline tabular-nums"
                      >
                        {project.code}
                      </Link>
                      <p className="mt-0.5 max-w-[20rem] text-[13px] font-semibold leading-snug text-[#1D1D1F]">
                        {project.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[#6E6E73] tabular-nums">
                        {sector?.code ?? project.sectorId} · {relatedIssues.length} linked issues
                        {overdue > 0 ? ` · ${overdue}d overdue` : ""}
                      </p>
                    </th>
                    <td className="max-w-[14rem] px-3 py-3.5 align-top text-[12px] leading-snug text-[#6E6E73]">
                      {project.authority}
                    </td>
                    <td className="px-3 py-3.5 text-right align-top text-[12.5px] text-[#1D1D1F] tabular-nums">
                      {formatBdtCompact(project.allocatedBudgetBdt)}
                    </td>
                    <td className="px-3 py-3.5 text-right align-top text-[12.5px] font-medium text-[#0055CC] tabular-nums">
                      {formatBdtCompact(project.reportedExpenditureBdt)}
                    </td>
                    <td className="px-3 py-3.5 text-right align-top text-[12.5px] font-medium tabular-nums">
                      {project.verifiedExpenditureBdt === undefined ? (
                        <span className={TONES.warn.label}>Missing</span>
                      ) : (
                        <span className="text-[#1A7F37]">
                          {formatBdtCompact(project.verifiedExpenditureBdt)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 align-top">
                      <div className="w-32">
                        <SpendBar
                          allocated={project.allocatedBudgetBdt}
                          reported={project.reportedExpenditureBdt}
                          verified={project.verifiedExpenditureBdt}
                          height="h-1.5"
                        />
                        <p className="mt-1 text-[11px] text-[#6E6E73] tabular-nums">
                          {formatPercent(reportedPct, 0)} reported
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <div className="w-24">
                        <ProgressBar
                          value={project.verifiedProgressPercent}
                          tone={projectStatusTone(project.status)}
                          className="h-1.5"
                          label={`${project.verifiedProgressPercent} percent verified progress`}
                        />
                        <p className="mt-1 text-[11px] text-[#6E6E73] tabular-nums">
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

      <Panel className="p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
