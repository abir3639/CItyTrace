import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Coins,
  FileWarning,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { anomalyKindLabel, type AnomalyFinding, type AnomalyKind } from "@/lib/anomalies";
import { recordHref } from "@/lib/links";
import { TONES } from "@/utils/formatters";

const KIND_ICON: Record<AnomalyKind, LucideIcon> = {
  spend: Coins,
  progress: TrendingUp,
  schedule: CalendarClock,
  milestone: AlertTriangle,
  evidence: FileWarning,
  recurrence: RefreshCw,
};

const SEVERITY_TONE = {
  high: "danger",
  medium: "warn",
  low: "neutral",
} as const;

/** City-wide findings produced by the anomaly sweep. */
export default function FindingsFeed({
  findings,
  limit = 8,
}: {
  findings: AnomalyFinding[];
  limit?: number;
}) {
  const visible = findings.slice(0, limit);

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <PanelHeader
        title="City-wide findings"
        description="Every flagged inconsistency in the record, ranked by severity. Observations to verify — not allegations."
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        actions={
          <span className="font-mono text-[10px] text-slate-400">
            {visible.length} of {findings.length}
          </span>
        }
      />

      {findings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/30 px-3 py-6 text-center font-mono text-[10px] text-slate-500">
          No inconsistencies detected in the current record.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {visible.map((finding) => {
            const Icon = KIND_ICON[finding.kind];
            const tone = SEVERITY_TONE[finding.severity];
            const projectHref = finding.projectId ? recordHref(finding.projectId) : null;

            return (
              <li
                key={finding.id}
                className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-[#08101d] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                    <Icon className="h-3 w-3 text-cyan-400" />
                    {anomalyKindLabel(finding.kind)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Badge tone={tone} dot>
                      {finding.severity.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-[9px] text-slate-500">
                      {finding.confidence}% conf.
                    </span>
                  </span>
                </div>

                <p className="text-[12px] font-semibold leading-snug text-slate-100">
                  {finding.title}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400">{finding.detail}</p>

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800/70 pt-1.5">
                  {projectHref && finding.projectId ? (
                    <Link
                      href={projectHref}
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-300 hover:text-cyan-100"
                    >
                      {finding.projectId}
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    </Link>
                  ) : null}
                  {finding.issueIds.slice(0, 3).map((issueId) => {
                    const href = recordHref(issueId);
                    if (!href) return null;
                    return (
                      <Link
                        key={issueId}
                        href={href}
                        className={`inline-flex items-center gap-1 font-mono text-[10px] hover:text-slate-200 ${TONES.neutral.label}`}
                      >
                        {issueId}
                      </Link>
                    );
                  })}
                  {finding.issueIds.length > 3 ? (
                    <span className="font-mono text-[9px] text-slate-500">
                      +{finding.issueIds.length - 3} more
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
