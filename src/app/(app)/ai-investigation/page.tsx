import type { Metadata } from "next";
import { AlertTriangle, FolderKanban, RefreshCw, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Data";
import { Badge } from "@/components/ui/Badge";
import InvestigationWorkbench from "@/components/ai/InvestigationWorkbench";
import ProjectComparison from "@/components/ai/ProjectComparison";
import CivicAsk from "@/components/ai/CivicAsk";
import FindingsFeed from "@/components/ai/FindingsFeed";
import { projectsById } from "@/data";
import { analyzeProject } from "@/lib/analysis";
import { findAnomalies, summariseAnomalies } from "@/lib/anomalies";
import { listAllEvidence, listIssues } from "@/lib/issue-store";

export const metadata: Metadata = {
  title: "AI Investigation · CityTrace",
};

export const dynamic = "force-dynamic";

export default async function AiInvestigationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested =
    typeof params.project === "string" && params.project.length > 0 ? params.project : null;
  const initialProjectId = requested && projectsById.has(requested) ? requested : null;

  const issues = listIssues();
  const allEvidence = listAllEvidence();
  const findings = findAnomalies(issues, allEvidence);
  const summary = summariseAnomalies(findings);
  const initialReport = initialProjectId
    ? analyzeProject(initialProjectId, issues, allEvidence)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="AI Investigation Engine"
        title="Evidence-bound Civic Analysis"
        description="Cross-examines projects, budgets, milestones, and citizen reports to highlight discrepancies traced back to source records."
        actions={
          <Badge tone="neutral">Observations only · Not allegations</Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Findings raised"
          value={String(summary.total)}
          hint="Across spending, schedule, milestones & recurrence"
          tone="info"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Critical & high alerts"
          value={String(summary.critical + summary.high)}
          hint={`${summary.critical} critical · ${summary.high} high severity`}
          tone="danger"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Projects implicated"
          value={String(summary.projects)}
          hint="Works carrying at least one finding"
          tone="warn"
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          label="Recurring locations"
          value={String(
            findings.filter((finding) => finding.kind === "recurrence").length
          )}
          hint="Sites reported multiple times and still open"
          tone="warn"
          icon={<RefreshCw className="h-4 w-4" />}
        />
      </div>

      <CivicAsk />

      <FindingsFeed findings={findings} limit={10} />

      <div className="pt-2">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
          Deep-dive Investigation
        </h2>
        <p className="mt-1 text-[13.5px] text-[#6E6E73]">
          Pick a featured case or any sanctioned work for a full evidence trail and verification checklist.
        </p>
      </div>

      <InvestigationWorkbench
        initialProjectId={initialProjectId}
        initialReport={initialReport}
      />

      <ProjectComparison issues={issues} />
    </div>
  );
}
