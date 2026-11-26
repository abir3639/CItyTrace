"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, Sparkles } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, SpendBar } from "@/components/ui/Data";
import { PROJECTS, getSector } from "@/data";
import {
  CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  type Issue,
  type Project,
} from "@/types/citytrace";
import { getBudgetFor, getMilestoneTotals, getProjectOverdueDays } from "@/lib/stats";
import {
  formatBdtCompact,
  formatPercent,
  projectStatusTone,
} from "@/utils/formatters";

function ProjectCompareCard({
  project,
  issues,
  sideLabel,
}: {
  project: Project;
  issues: Issue[];
  sideLabel: string;
}) {
  const sector = getSector(project.sectorId);
  const budget = getBudgetFor(project);
  const milestones = getMilestoneTotals(project);
  const overdue = getProjectOverdueDays(project);
  const linkedIssues = issues.filter((issue) => issue.projectId === project.id);
  const openCount = linkedIssues.filter((issue) => issue.status !== "resolved").length;
  const totalReports = linkedIssues.reduce((sum, issue) => sum + issue.reportCount, 0);

  return (
    <div className="flex flex-col gap-3.5 rounded-[16px] border border-black/[0.06] bg-[#F9FAFB] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-[#6E6E73]">{sideLabel}</span>
        <div className="flex items-center gap-1.5">
          <Badge tone={projectStatusTone(project.status)} dot>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
          {overdue > 0 ? <Badge tone="warn">{overdue}d late</Badge> : null}
        </div>
      </div>

      <div>
        <p className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
          {project.code} · {CATEGORY_LABELS[project.category]}
        </p>
        <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-[#1D1D1F]">
          {project.name}
        </h3>
        <p className="mt-0.5 text-[12px] text-[#6E6E73]">
          {project.authority} · {sector?.code ?? project.sectorId}
        </p>
      </div>

      <div className="space-y-1.5 rounded-[12px] border border-black/[0.05] bg-white p-3">
        <div className="flex items-baseline justify-between gap-2 text-[12px] tabular-nums">
          <span className="text-[#6E6E73]">Spend vs. Allocation</span>
          <span className="font-semibold text-[#1D1D1F]">
            {formatBdtCompact(budget.reported)} / {formatBdtCompact(budget.allocated)}
          </span>
        </div>
        <SpendBar
          allocated={budget.allocated}
          reported={budget.reported}
          verified={budget.verified}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] tabular-nums">
          <span className="text-[#6E6E73]">
            Reported {formatPercent(budget.reportedPercent)}
          </span>
          <span
            className={
              budget.verified === undefined
                ? "font-medium text-[#B25000]"
                : "font-medium text-[#1A7F37]"
            }
          >
            {budget.verified === undefined
              ? "Verified spend missing"
              : `${formatBdtCompact(budget.verified)} verified (${formatPercent(budget.verifiedPercent ?? 0)})`}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 rounded-[12px] border border-black/[0.05] bg-white p-3">
        <div className="flex items-baseline justify-between gap-2 text-[12px] tabular-nums">
          <span className="text-[#6E6E73]">Verified physical progress</span>
          <span className="font-semibold text-[#1D1D1F]">{project.verifiedProgressPercent}%</span>
        </div>
        <ProgressBar
          value={project.verifiedProgressPercent}
          tone={projectStatusTone(project.status)}
          label={`${project.verifiedProgressPercent} percent physical progress`}
        />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[12px] border border-black/[0.05] bg-white px-2.5 py-2">
          <dt className="text-[11px] text-[#6E6E73]">Milestones</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-[#1D1D1F] tabular-nums">
            {milestones.met}/{milestones.total}
          </dd>
        </div>
        <div className="rounded-[12px] border border-black/[0.05] bg-white px-2.5 py-2">
          <dt className="text-[11px] text-[#6E6E73]">Open issues</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-[#C9241B] tabular-nums">
            {openCount}/{linkedIssues.length}
          </dd>
        </div>
        <div className="rounded-[12px] border border-black/[0.05] bg-white px-2.5 py-2">
          <dt className="text-[11px] text-[#6E6E73]">Citizen reports</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-[#1D1D1F] tabular-nums">
            {totalReports}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/public-projects/${project.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
        >
          Ledger <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href={`/ai-investigation?project=${project.id}`}
          className="inline-flex items-center gap-1 rounded-full bg-[#007AFF]/[0.1] px-3 py-1.5 text-[12px] font-semibold text-[#0055CC] hover:bg-[#007AFF]/[0.16]"
        >
          <Sparkles className="h-3 w-3" /> Audit in workbench
        </Link>
      </div>
    </div>
  );
}

export default function ProjectComparison({ issues }: { issues: Issue[] }) {
  const [leftId, setLeftId] = useState("P-R01");
  const [rightId, setRightId] = useState("P-L03");

  const left = useMemo(
    () => PROJECTS.find((p) => p.id === leftId) ?? PROJECTS[0],
    [leftId]
  );
  const right = useMemo(
    () => PROJECTS.find((p) => p.id === rightId) ?? PROJECTS[1] ?? PROJECTS[0],
    [rightId]
  );

  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelHeader
          title="Side-by-Side Cost & Delivery Comparison"
          description="Contrast two sanctioned works across verified spend, overdue schedule, milestone adherence, and citizen issue pressure."
          icon={<GitCompareArrows className="h-4 w-4" />}
        />

        <div className="print-hidden flex flex-wrap items-center gap-2 text-[12px]">
          <label className="flex items-center gap-1.5 text-[#6E6E73]">
            Case A:
            <select
              value={left.id}
              onChange={(event) => setLeftId(event.target.value)}
              className="max-w-[200px] truncate rounded-full border border-black/[0.08] bg-[#F5F5F7] px-3 py-1.5 text-[12px] font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:bg-white focus:outline-none cursor-pointer"
            >
              {PROJECTS.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name.slice(0, 32)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[#6E6E73]">
            Case B:
            <select
              value={right.id}
              onChange={(event) => setRightId(event.target.value)}
              className="max-w-[200px] truncate rounded-full border border-black/[0.08] bg-[#F5F5F7] px-3 py-1.5 text-[12px] font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:bg-white focus:outline-none cursor-pointer"
            >
              {PROJECTS.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name.slice(0, 32)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProjectCompareCard project={left} issues={issues} sideLabel="Case A" />
        <ProjectCompareCard project={right} issues={issues} sideLabel="Case B" />
      </div>
    </Panel>
  );
}
