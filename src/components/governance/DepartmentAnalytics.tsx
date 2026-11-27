import Link from "next/link";
import { Building2 } from "lucide-react";
import type { DepartmentPerformance } from "@/lib/stats";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { formatPercent } from "@/utils/formatters";

function formatOptionalPercent(value: number | null): string {
  return value === null ? "N/A" : formatPercent(value, 0);
}

function formatOptionalDays(value: number | null): string {
  return value === null ? "N/A" : `${value}d`;
}

export default function DepartmentAnalytics({
  rows,
}: {
  rows: DepartmentPerformance[];
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-black/[0.06] px-5 py-4">
        <PanelHeader
          title="Department Operational Performance"
          description="Live SLA timeliness, first-pass repair verification, and recurrence metrics per department (N/A where sample denominator is zero)."
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Department operational performance table"
        className="ct-scroll overflow-x-auto"
      >
        <table className="w-full min-w-[920px] border-collapse text-left">
          <caption className="sr-only">
            Department accountability metrics computed from active and resolved civic issues
          </caption>
          <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
            <tr className="border-b border-black/[0.06] text-[12px] font-medium text-[#6E6E73]">
              <th scope="col" className="px-5 py-3">Department</th>
              <th scope="col" className="px-3 py-3 text-right">Assigned</th>
              <th scope="col" className="px-3 py-3 text-right">Active</th>
              <th scope="col" className="px-3 py-3 text-right">Verified</th>
              <th scope="col" className="px-3 py-3 text-right">Overdue rate</th>
              <th scope="col" className="px-3 py-3 text-right">Avg repair</th>
              <th scope="col" className="px-3 py-3 text-right">Avg verify wait</th>
              <th scope="col" className="px-3 py-3 text-right">On-time rate</th>
              <th scope="col" className="px-3 py-3 text-right">1st-pass verify</th>
              <th scope="col" className="px-5 py-3 text-right">Recurrence rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05] bg-white">
            {rows.map((row) => (
              <tr key={row.departmentId} className="transition-colors hover:bg-[#F9FAFB]">
                <th scope="row" className="px-5 py-3.5 font-normal">
                  <Link
                    href={`/civic-issues?dept=${row.departmentId}`}
                    className="group block"
                  >
                    <span className="text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
                      {row.code}
                    </span>
                    <p className="text-[13px] font-semibold text-[#1D1D1F] group-hover:text-[#007AFF]">
                      {row.shortName}
                    </p>
                  </Link>
                </th>
                <td className="px-3 py-3.5 text-right text-[12.5px] font-medium text-[#1D1D1F] tabular-nums">
                  {row.totalAssigned}
                </td>
                <td className="px-3 py-3.5 text-right text-[12.5px] text-[#48484A] tabular-nums">
                  {row.activeIssues}
                </td>
                <td className="px-3 py-3.5 text-right text-[12.5px] font-semibold text-[#1A7F37] tabular-nums">
                  {row.verifiedResolutions}
                </td>
                <td
                  className={`px-3 py-3.5 text-right text-[12.5px] font-semibold tabular-nums ${
                    row.overdueRepairRate !== null && row.overdueRepairRate > 25
                      ? "text-[#C9241B]"
                      : "text-[#48484A]"
                  }`}
                >
                  {formatOptionalPercent(row.overdueRepairRate)}
                </td>
                <td className="px-3 py-3.5 text-right text-[12.5px] text-[#48484A] tabular-nums">
                  {formatOptionalDays(row.avgRepairDurationDays)}
                </td>
                <td className="px-3 py-3.5 text-right text-[12.5px] text-[#48484A] tabular-nums">
                  {formatOptionalDays(row.avgVerificationDelayDays)}
                </td>
                <td className="px-3 py-3.5 text-right text-[12.5px] text-[#1D1D1F] tabular-nums">
                  {formatOptionalPercent(row.onTimeCompletionRate)}
                </td>
                <td
                  className={`px-3 py-3.5 text-right text-[12.5px] font-semibold tabular-nums ${
                    row.firstPassVerificationRate === null
                      ? "text-[#86868B]"
                      : row.firstPassVerificationRate >= 80
                        ? "text-[#1A7F37]"
                        : "text-[#B25000]"
                  }`}
                >
                  {formatOptionalPercent(row.firstPassVerificationRate)}
                </td>
                <td
                  className={`px-5 py-3.5 text-right text-[12.5px] font-semibold tabular-nums ${
                    row.recurrenceRate !== null && row.recurrenceRate > 25
                      ? "text-[#C9241B]"
                      : "text-[#48484A]"
                  }`}
                >
                  {formatOptionalPercent(row.recurrenceRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
