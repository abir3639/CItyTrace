import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FilePlus2,
  Flag,
  FolderKanban,
  RefreshCw,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import type { AccountabilityEvent, AccountabilityEventType } from "@/types/citytrace";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import { formatDate } from "@/utils/formatters";

const EVENT_META: Record<
  AccountabilityEventType,
  { icon: typeof Clock; dot: string; label: string }
> = {
  issue_created: { icon: FilePlus2, dot: "bg-[#64748B]", label: "Reported" },
  evidence_submitted: { icon: FileCheck2, dot: "bg-[#007AFF]", label: "Evidence added" },
  evidence_verified: { icon: ShieldCheck, dot: "bg-[#34C759]", label: "Evidence verified" },
  evidence_flagged: { icon: Flag, dot: "bg-[#FF3B30]", label: "Evidence flagged" },
  evidence_revoked: { icon: AlertTriangle, dot: "bg-[#FF9500]", label: "Verification revoked" },
  status_changed: { icon: Clock, dot: "bg-[#AF52DE]", label: "Status update" },
  department_assigned: { icon: Building2, dot: "bg-[#007AFF]", label: "Department assigned" },
  official_response: { icon: Building2, dot: "bg-[#007AFF]", label: "Official response" },
  project_linked: { icon: FolderKanban, dot: "bg-[#007AFF]", label: "Project linked" },
  deadline_set: { icon: CalendarClock, dot: "bg-[#007AFF]", label: "Deadline set" },
  deadline_changed: { icon: CalendarClock, dot: "bg-[#FF9500]", label: "Deadline changed" },
  sla_breached: { icon: AlertTriangle, dot: "bg-[#FF3B30]", label: "SLA breached" },
  repair_submitted: { icon: Wrench, dot: "bg-[#FF9500]", label: "Repair submitted" },
  repair_approved: { icon: ClipboardCheck, dot: "bg-[#34C759]", label: "Repair certified" },
  repair_rejected: { icon: XCircle, dot: "bg-[#FF3B30]", label: "Repair rejected" },
  recurrence_requested: { icon: RefreshCw, dot: "bg-[#FF9500]", label: "Recurrence filed" },
  issue_reopened: { icon: AlertTriangle, dot: "bg-[#FF3B30]", label: "Reopened" },
  issue_resolved: { icon: CheckCircle2, dot: "bg-[#34C759]", label: "Resolved" },
};

/**
 * Append-only public accountability timeline showing every lifecycle step,
 * actor role, transition values, work orders, and evidence references.
 */
export default function AccountabilityTimeline({
  events,
}: {
  events: AccountabilityEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="rounded-[14px] bg-[#F5F5F7] px-4 py-6 text-center text-[13px] text-[#6E6E73]">
        No accountability events recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-4 border-l border-black/[0.08] pl-4">
      {events.map((event, idx) => {
        const meta = EVENT_META[event.type] ?? EVENT_META.status_changed;
        const Icon = meta.icon;
        const isLast = idx === events.length - 1;

        return (
          <li key={event.id} className="relative">
            <span
              className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${meta.dot}`}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-medium text-[#6E6E73] tabular-nums">
                {formatDate(event.timestamp)}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.07] bg-[#F5F5F7] px-2 py-0.5 text-[11px] font-semibold text-[#1D1D1F]">
                <Icon className="h-3 w-3 text-[#007AFF]" />
                {meta.label}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] py-0.5 pl-1 pr-2 text-[11.5px] font-medium text-[#1D1D1F]">
                <UserAvatar
                  initials={event.actorInitials}
                  color={event.actorAvatarColor}
                  size="xs"
                  className="h-4 w-4 text-[8px] ring-0"
                />
                {event.actorName}
              </span>

              <RolePill role={event.actorRole} />

              {isLast ? (
                <span className="rounded-full bg-[#007AFF]/[0.1] px-2 py-0.5 text-[10.5px] font-semibold text-[#0055CC]">
                  Latest
                </span>
              ) : null}
            </div>

            {event.previousValue || event.newValue ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-[#48484A] tabular-nums">
                {event.previousValue ? (
                  <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[#6E6E73]">
                    {event.previousValue}
                  </span>
                ) : null}
                {event.previousValue && event.newValue ? (
                  <ArrowRight className="h-3 w-3 text-[#86868B]" />
                ) : null}
                {event.newValue ? (
                  <span className="rounded bg-[#007AFF]/[0.1] px-1.5 py-0.5 text-[#0055CC]">
                    {event.newValue}
                  </span>
                ) : null}
              </div>
            ) : null}

            <p className="mt-1.5 text-[13px] leading-relaxed text-[#48484A]">
              {event.description}
            </p>

            {event.workOrderRef || event.projectId || (event.evidenceIds && event.evidenceIds.length > 0) ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
                {event.workOrderRef ? (
                  <span className="rounded-full border border-black/[0.08] bg-white px-2 py-0.5 font-semibold text-[#1D1D1F]">
                    WO: {event.workOrderRef}
                  </span>
                ) : null}
                {event.projectId ? (
                  <Link
                    href={`/public-projects/${event.projectId}`}
                    className="rounded-full border border-[#007AFF]/20 bg-[#007AFF]/[0.07] px-2 py-0.5 font-semibold text-[#0055CC] hover:underline"
                  >
                    Project {event.projectId}
                  </Link>
                ) : null}
                {event.evidenceIds?.map((evId) => (
                  <span
                    key={evId}
                    className="rounded-full border border-black/[0.06] bg-[#F5F5F7] px-2 py-0.5 font-medium text-[#6E6E73]"
                  >
                    Evidence {evId}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
