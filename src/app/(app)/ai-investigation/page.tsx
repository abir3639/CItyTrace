import type { Metadata } from "next";
import { AlertTriangle, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Data";
import InvestigationWorkbench from "@/components/ai/InvestigationWorkbench";
import CivicAsk from "@/components/ai/CivicAsk";
import FindingsFeed from "@/components/ai/FindingsFeed";
import { projectsById } from "@/data";
import { findAnomalies, summariseAnomalies } from "@/lib/anomalies";
import { listIssues } from "@/lib/issue-store";

export const metadata: Metadata = {
  title: "AI Investigation · CITYTRACE",
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
  const findings = findAnomalies(issues);
  const summary = summariseAnomalies(findings);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="AI Investigation Engine"
        title="Evidence-bound civic analysis"
        description="The engine reads the whole district — projects, budgets, milestones and citizen reports — and surfaces what does not reconcile, with every finding traced back to the records behind it."
        actions={
          <span className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber-200">
            OBSERVATIONS · NOT ALLEGATIONS
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Findings raised"
          value={String(summary.total)}
          hint="Across spending, schedule, milestones and recurrence"
          tone="info"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="High severity"
          value={String(summary.high)}
          hint="Material gaps that need verification first"
          tone="danger"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Projects implicated"
          value={String(summary.projects)}
          hint="Works carrying at least one finding"
          tone="warn"
          icon={<RefreshCw className="h-4 w-4" />}
        />
        <StatCard
          label="Recurring locations"
          value={String(
            findings.filter((finding) => finding.kind === "recurrence").length
          )}
          hint="Sites reported more than once and still open"
          tone="warn"
          icon={<RefreshCw className="h-4 w-4" />}
        />
      </div>

      <CivicAsk />

      <FindingsFeed findings={findings} limit={10} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.16em] text-cyan-300 uppercase">
            Deep-dive investigation
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-transparent" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Pick any sanctioned work for a full evidence trail: recurrence history,
          schedule slip, spending reconciliation and the verification steps that
          follow from it.
        </p>
      </div>

      <InvestigationWorkbench initialProjectId={initialProjectId} />
    </div>
  );
}
