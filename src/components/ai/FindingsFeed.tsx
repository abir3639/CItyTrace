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

export default function FindingsFeed({
  findings,
  limit = 8,
}: {
  findings: AnomalyFinding[];
  limit?: number;
}) {
  const visible = findings.slice(0, limit);

  return (
    <Panel className="flex flex-col gap-4 p-5">
      <PanelHeader
        title="City-wide Findings"
        description="Automated observations requiring verification — not allegations."
        icon={<AlertTriangle className="h-4 w-4" />}
        actions={
          <span className="text-[12px] font-medium text-[#6E6E73] tabular-nums">
            {visible.length} of {findings.length}
          </span>
        }
      />

      {findings.length === 0 ? (
        <p className="rounded-[14px] bg-[#F5F5F7] px-4 py-8 text-center text-[13px] text-[#6E6E73]">
          No inconsistencies detected in the current record.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {visible.map((finding) => {
            const Icon = KIND_ICON[finding.kind];
            const tone = SEVERITY_TONE[finding.severity];
            const projectHref = finding.projectId ? recordHref(finding.projectId) : null;

            return (
              <li
                key={finding.id}
                className="flex flex-col gap-2 rounded-[16px] border border-black/[0.06] bg-[#F9FAFB] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#6E6E73]">
                    <Icon className="h-3.5 w-3.5 text-[#007AFF]" />
                    {anomalyKindLabel(finding.kind)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={tone} dot>
                      {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
                    </Badge>
                    <span className="text-[11.5px] text-[#6E6E73] tabular-nums">
                      {finding.confidence}% conf.
                    </span>
                  </span>
                </div>

                <p className="text-[14px] font-semibold leading-snug text-[#1D1D1F]">
                  {finding.title}
                </p>
                <p className="text-[12.5px] leading-relaxed text-[#48484A]">{finding.detail}</p>

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/[0.05] pt-2.5 text-[12px]">
                  {projectHref && finding.projectId ? (
                    <Link
                      href={projectHref}
                      className="inline-flex items-center gap-1 font-semibold text-[#007AFF] hover:underline tabular-nums"
                    >
                      {finding.projectId}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                  {finding.issueIds.slice(0, 3).map((issueId) => {
                    const href = recordHref(issueId);
                    if (!href) return null;
                    return (
                      <Link
                        key={issueId}
                        href={href}
                        className="font-medium text-[#6E6E73] hover:text-[#1D1D1F] tabular-nums"
                      >
                        {issueId}
                      </Link>
                    );
                  })}
                  {finding.issueIds.length > 3 ? (
                    <span className="text-[11.5px] text-[#86868B] tabular-nums">
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
