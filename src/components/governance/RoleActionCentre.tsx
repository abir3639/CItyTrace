import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Flag,
  FolderKanban,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getDepartment, getDepartmentForIssue } from "@/lib/departments";
import { deriveIssueSla } from "@/lib/sla";
import {
  ISSUE_STATUS_LABELS,
  type Evidence,
  type Issue,
  type PublicUser,
  type UserWatchlist,
} from "@/types/citytrace";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import PermissionLockBanner from "./PermissionLockBanner";
import { issueStatusTone } from "@/utils/formatters";

interface ActionQueueTile {
  label: string;
  count: number;
  sub: string;
  href: string;
  icon: typeof AlertTriangle;
  highlight?: "danger" | "warn" | "info" | "ok" | "purple";
}

const TILE_ACCENT = {
  danger: "border-[#FF3B30]/20 bg-[#FF3B30]/[0.06] text-[#C9241B]",
  warn: "border-[#FF9500]/25 bg-[#FF9500]/[0.07] text-[#B25000]",
  info: "border-[#007AFF]/20 bg-[#007AFF]/[0.06] text-[#0055CC]",
  ok: "border-[#34C759]/20 bg-[#34C759]/[0.07] text-[#1A7F37]",
  purple: "border-[#AF52DE]/20 bg-[#AF52DE]/[0.07] text-[#7C3AED]",
} as const;

export default function RoleActionCentre({
  user,
  issues,
  evidence,
  watchlist,
  demoEnabled,
}: {
  user: PublicUser | null;
  issues: Issue[];
  evidence: Evidence[];
  watchlist: UserWatchlist;
  demoEnabled: boolean;
}) {
  if (!user) {
    return (
      <Panel glow className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold text-[#007AFF]">
              Role-Based Civic Accountability Loop
            </p>
            <h2 className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              Inspect CityTrace as a Citizen, Civic Verifier, or Municipal Official
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6E6E73]">
              Sign in or choose a demo role below to unlock your role-specific Action
              Centre, personalized watchlist notifications, evidence verification, and
              departmental SLA workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-xs hover:bg-[#0066D6]"
            >
              Sign in / Demo Switcher <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {demoEnabled ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <PermissionLockBanner
              title="Citizen Queue"
              reason="Report hazards, follow sectors, cast 1 vote per issue, and report post-repair recurrence."
              requiredRole="citizen"
              demoEnabled={demoEnabled}
            />
            <PermissionLockBanner
              title="Verifier Queue"
              reason="Moderate evidence, approve intake reviews, and certify or reject completed repairs."
              requiredRole="verifier"
              demoEnabled={demoEnabled}
            />
            <PermissionLockBanner
              title="Official Queue"
              reason="Respond for your department, assign teams/work orders, set SLAs, and submit repairs."
              requiredRole="official"
              requiredDepartmentId="DEPT-ROADS"
              demoEnabled={demoEnabled}
            />
          </div>
        ) : null}
      </Panel>
    );
  }

  let tiles: ActionQueueTile[] = [];
  let priorityIssues: Issue[] = [];
  let title = "Action Centre";
  let subtitle = "";

  if (user.role === "citizen") {
    const myReports = issues.filter((i) => i.reportedBy?.id === user.id);
    const myVotes = issues.filter((i) => i.votes?.some((v) => v.userId === user.id));
    const followedSectorIssues = issues.filter(
      (i) => watchlist.sectors.includes(i.sectorId) && i.status !== "resolved"
    );
    const officialResponses = issues.filter((i) => Boolean(i.officialResponse));
    const verifiedRepairs = issues.filter(
      (i) => i.status === "resolved" && i.resolutionVerification === "verified"
    );
    const myRecurrences = issues.filter((i) =>
      i.recurrenceRequests?.some((r) => r.requestedBy.id === user.id)
    );

    title = "Citizen Action Centre";
    subtitle = "Track your complaints, votes, followed neighbourhoods, and verified fixes.";
    tiles = [
      {
        label: "My Reports",
        count: myReports.length,
        sub: "Filed under your name",
        href: "/profile",
        icon: FileCheck2,
        highlight: "info",
      },
      {
        label: "Confirmed Issues",
        count: myVotes.length,
        sub: "Active votes cast",
        href: "/profile",
        icon: CheckCircle2,
        highlight: "ok",
      },
      {
        label: "Followed Sector Open",
        count: followedSectorIssues.length,
        sub: `${watchlist.sectors.length} sector(s) followed`,
        href: "/civic-issues?followed=1",
        icon: Bookmark,
        highlight: "warn",
      },
      {
        label: "Official Responses",
        count: officialResponses.length,
        sub: "Published repair plans",
        href: "/civic-issues?status=in_progress",
        icon: Wrench,
        highlight: "info",
      },
      {
        label: "Verified Repairs",
        count: verifiedRepairs.length,
        sub: "Certified by verifiers",
        href: "/civic-issues?status=resolved",
        icon: ShieldCheck,
        highlight: "ok",
      },
      {
        label: "Followed Projects",
        count: watchlist.projects.length,
        sub: `${myRecurrences.length} recurrence req.`,
        href: "/public-projects",
        icon: FolderKanban,
        highlight: "purple",
      },
    ];
    priorityIssues = (followedSectorIssues.length > 0 ? followedSectorIssues : issues)
      .filter((i) => i.status !== "resolved")
      .slice(0, 3);
  } else if (user.role === "verifier") {
    const awaitingReview = issues.filter((i) => i.status === "reported");
    const unverifiedEv = evidence.filter(
      (e) => (e.status ?? (e.verified ? "verified" : "unverified")) === "unverified"
    );
    const flaggedEv = evidence.filter((e) => e.status === "flagged");
    const awaitingVerify = issues.filter((i) => i.status === "awaiting_verification");
    const pendingRecurrence = issues.filter((i) =>
      i.recurrenceRequests?.some((r) => r.status === "pending")
    );
    const failedAudits = issues.filter((i) =>
      i.repairAttempts?.some((a) => a.verification?.decision === "rejected")
    );

    title = "Civic Verifier Action Centre";
    subtitle = "Independent review queues prioritized by verification wait time and risk.";
    tiles = [
      {
        label: "Awaiting Intake Review",
        count: awaitingReview.length,
        sub: "Reported → Under Review",
        href: "/civic-issues?status=reported",
        icon: AlertTriangle,
        highlight: "purple",
      },
      {
        label: "Repairs to Certify",
        count: awaitingVerify.length,
        sub: "Approve or Reject completion",
        href: "/civic-issues?status=awaiting_verification",
        icon: ClipboardCheck,
        highlight: "warn",
      },
      {
        label: "Unverified Evidence",
        count: unverifiedEv.length,
        sub: "Photos & logs pending check",
        href: "/civic-issues",
        icon: FileCheck2,
        highlight: "info",
      },
      {
        label: "Flagged Evidence",
        count: flaggedEv.length,
        sub: "Discrepancies flagged",
        href: "/ai-investigation",
        icon: Flag,
        highlight: "danger",
      },
      {
        label: "Recurrence Requests",
        count: pendingRecurrence.length,
        sub: "Substantiate & reopen",
        href: "/civic-issues?status=resolved",
        icon: RefreshCw,
        highlight: "warn",
      },
      {
        label: "Failed Repair Audits",
        count: failedAudits.length,
        sub: "Rejected submissions",
        href: "/civic-issues?status=reopened",
        icon: ShieldCheck,
        highlight: "danger",
      },
    ];
    priorityIssues = [...awaitingVerify, ...pendingRecurrence, ...awaitingReview].slice(0, 3);
  } else {
    const dept = getDepartment(user.departmentId);
    const deptIssues = issues.filter(
      (i) => !dept || getDepartmentForIssue(i).id === dept.id
    );
    const awaitingAction = deptIssues.filter((i) => i.status === "under_review");
    const activeRepairs = deptIssues.filter((i) => i.status === "in_progress");
    const dueSoon = activeRepairs.filter((i) => deriveIssueSla(i).state === "due_soon");
    const overdue = activeRepairs.filter((i) => deriveIssueSla(i).state === "overdue");
    const awaitingVerification = deptIssues.filter(
      (i) => i.status === "awaiting_verification"
    );
    const reopened = deptIssues.filter((i) => i.status === "reopened");

    title = `Official Action Centre · ${dept?.shortName ?? "Department"}`;
    subtitle = "Departmental repair backlog, SLA deadlines, and reopened inspections.";
    tiles = [
      {
        label: "Department Queue",
        count: deptIssues.filter((i) => i.status !== "resolved").length,
        sub: `${deptIssues.length} total assigned`,
        href: dept ? `/civic-issues?dept=${dept.id}` : "/civic-issues",
        icon: FolderKanban,
        highlight: "info",
      },
      {
        label: "Awaiting Action",
        count: awaitingAction.length,
        sub: "Under Review → Start Repair",
        href: `/civic-issues?status=under_review${dept ? `&dept=${dept.id}` : ""}`,
        icon: AlertTriangle,
        highlight: "purple",
      },
      {
        label: "Active Repairs",
        count: activeRepairs.length,
        sub: `${dueSoon.length} due within 72h`,
        href: `/civic-issues?status=in_progress${dept ? `&dept=${dept.id}` : ""}`,
        icon: Wrench,
        highlight: "info",
      },
      {
        label: "Overdue Repairs",
        count: overdue.length,
        sub: "Elapsed estimated deadline",
        href: `/civic-issues?sla=overdue${dept ? `&dept=${dept.id}` : ""}`,
        icon: CalendarClock,
        highlight: "danger",
      },
      {
        label: "Awaiting Verification",
        count: awaitingVerification.length,
        sub: "Submitted to Verifier",
        href: `/civic-issues?status=awaiting_verification${dept ? `&dept=${dept.id}` : ""}`,
        icon: ClipboardCheck,
        highlight: "warn",
      },
      {
        label: "Reopened Works",
        count: reopened.length,
        sub: "Requires corrective plan",
        href: `/civic-issues?status=reopened${dept ? `&dept=${dept.id}` : ""}`,
        icon: RefreshCw,
        highlight: "danger",
      },
    ];
    priorityIssues = [...overdue, ...reopened, ...awaitingAction, ...dueSoon].slice(0, 3);
  }

  return (
    <Panel glow className="flex flex-col gap-4 p-5">
      <PanelHeader
        title={title}
        description={subtitle}
        icon={<UserAvatar initials={user.initials} color={user.avatarColor} size="sm" />}
        actions={
          <div className="flex items-center gap-2">
            <RolePill role={user.role} />
            <Link
              href="/profile"
              className="text-[12.5px] font-semibold text-[#007AFF] hover:underline"
            >
              Profile &amp; Watchlist
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const cls = tile.highlight ? TILE_ACCENT[tile.highlight] : TILE_ACCENT.info;
          return (
            <Link
              key={tile.label}
              href={tile.href}
              className="group flex flex-col justify-between rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3 transition-all hover:-translate-y-[1px] hover:border-[#007AFF]/25 hover:bg-white hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border ${cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
                  {tile.count}
                </span>
              </div>
              <p className="mt-2 text-[12px] font-semibold leading-tight text-[#1D1D1F] group-hover:text-[#007AFF]">
                {tile.label}
              </p>
              <p className="mt-0.5 text-[11px] text-[#6E6E73]">{tile.sub}</p>
            </Link>
          );
        })}
      </div>

      {priorityIssues.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {priorityIssues.map((issue) => {
            const sla = deriveIssueSla(issue);
            return (
              <Link
                key={issue.id}
                href={`/civic-issues/${issue.id}`}
                className="flex items-center justify-between gap-2 rounded-[12px] border border-black/[0.06] bg-white px-3 py-2.5 transition-colors hover:bg-[#F5F5F7]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
                      {issue.code}
                    </span>
                    <Badge tone={issueStatusTone(issue.status)}>
                      {ISSUE_STATUS_LABELS[issue.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#1D1D1F]">
                    {issue.title}
                  </p>
                  <p className="text-[11px] text-[#6E6E73]">{sla.label}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#86868B]" />
              </Link>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );
}
