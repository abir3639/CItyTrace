import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LogIn,
  MapPin,
  Plus,
  ShieldCheck,
  ThumbsUp,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, StatCard } from "@/components/ui/Data";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import SignOutButton from "@/components/auth/SignOutButton";
import FollowButton from "@/components/governance/FollowButton";
import { PROJECTS, SECTORS, getSector } from "@/data";
import { getCurrentUser } from "@/lib/auth-store";
import { getDepartment } from "@/lib/departments";
import { getUserWatchlist } from "@/lib/governance-store";
import { listIssues } from "@/lib/issue-store";
import { canUserPerform } from "@/lib/permissions";
import { ISSUE_STATUS_LABELS, type Issue, type IssueEvent } from "@/types/citytrace";
import { TONES, formatDate, issueStatusTone } from "@/utils/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Civic Profile · CityTrace",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Account · Civic Identity"
          title="My Civic Profile"
          description="Sign in or register to view your filed complaints, site confirmation votes, and permanent timeline updates."
        />

        <Panel glow className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                Every voice on CityTrace is accountable
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#6E6E73]">
                Signing in links your reports and site confirmations to your public civic
                profile, prevents duplicate votes, and keeps a personal record of every street
                issue you helped surface.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/login?next=/profile"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6]"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href="/register?next=/profile"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-[13.5px] font-semibold text-[#1D1D1F] shadow-xs transition-colors hover:bg-[#F5F5F7]"
              >
                <UserPlus className="h-4 w-4 text-[#007AFF]" />
                Create account
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Named Complaints",
                text: "Filed reports display your name, role badge, and home sector publicly.",
              },
              {
                icon: ThumbsUp,
                title: "Verified Confirmation Votes",
                text: "Confirm lingering problems with on-site notes so neighbours see real turnout.",
              },
              {
                icon: ShieldCheck,
                title: "Personal Audit Ledger",
                text: "Track every status update or inspection entry authored under your identity.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="ct-surface-inset flex flex-col gap-2 rounded-[16px] p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#007AFF] shadow-2xs">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-[13.5px] font-semibold text-[#1D1D1F]">{item.title}</p>
                  <p className="text-[12.5px] leading-relaxed text-[#6E6E73]">{item.text}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    );
  }

  const issues = listIssues();
  const sector = getSector(user.sectorId);
  const dept = getDepartment(user.departmentId);
  const watchlist = await getUserWatchlist(user.id);
  const canReport = canUserPerform(user, "report_issue").allowed;
  const followedIssues = issues.filter((i) => watchlist.issues.includes(i.id));
  const followedProjects = PROJECTS.filter((p) => watchlist.projects.includes(p.id));

  const reportedIssues = issues.filter((issue) => issue.reportedBy?.id === user.id);
  const votedEntries: { issue: Issue; votedAt: string; note?: string }[] = [];
  const authoredEvents: { issue: Issue; event: IssueEvent }[] = [];

  for (const issue of issues) {
    const myVote = issue.votes?.find((vote) => vote.userId === user.id);
    if (myVote) {
      votedEntries.push({
        issue,
        votedAt: myVote.votedAt,
        note: myVote.note,
      });
    }
    for (const event of issue.history) {
      if (event.actorUserId === user.id) {
        authoredEvents.push({ issue, event });
      }
    }
  }

  authoredEvents.sort((a, b) => b.event.at.localeCompare(a.event.at));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Civic Identity · Active Session"
        title="My Civic Profile"
        description="Your public identity, filed complaints, site confirmation votes, and recorded audit updates."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {canReport ? (
              <Link
                href="/civic-issues/report"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6]"
              >
                <Plus className="h-4 w-4" /> Report an issue
              </Link>
            ) : null}
            <SignOutButton redirectTo="/profile" />
          </div>
        }
      />

      {/* Identity Card */}
      <Panel glow className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar initials={user.initials} color={user.avatarColor} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                  {user.name}
                </h2>
                <RolePill role={user.role} />
                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold text-[#6E6E73] tabular-nums">
                  {user.id}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-[#6E6E73]">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6E6E73]">
                {dept ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#B25000]">
                    {dept.code} · {dept.shortName}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#007AFF]" />
                  {sector ? `${sector.code} · ${sector.name} (${sector.ward})` : user.sectorId}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Calendar className="h-3.5 w-3.5 text-[#007AFF]" />
                  Member since {formatDate(user.joinedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Complaints filed"
          value={String(reportedIssues.length)}
          hint="Issues opened under your name"
          tone="info"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Issues confirmed"
          value={String(votedEntries.length)}
          hint="Active verification votes cast"
          tone="ok"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Timeline updates"
          value={String(authoredEvents.length)}
          hint="Permanent audit entries authored"
          tone="warn"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Complaints + Votes */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title={`Your Filed Complaints (${reportedIssues.length})`}
            description="Civic records where you are credited as the original complainant."
            icon={<FileText className="h-4 w-4" />}
          />

          {reportedIssues.length === 0 ? (
            <EmptyState
              title="No complaints filed yet"
              description={
                canReport
                  ? "Submit an infrastructure or service report to start tracking it permanently."
                  : "Municipal Official accounts manage assigned department repairs rather than filing citizen complaints."
              }
              action={
                canReport ? (
                  <Link
                    href="/civic-issues/report"
                    className="rounded-full bg-[#007AFF] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#0066D6]"
                  >
                    File your first report
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {reportedIssues.map((issue) => (
                <li key={issue.id}>
                  <Link
                    href={`/civic-issues/${issue.id}`}
                    className="block rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3.5 transition-colors hover:bg-[#F0F2F5]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                        {issue.code}
                      </span>
                      <Badge tone={issueStatusTone(issue.status)} dot>
                        {ISSUE_STATUS_LABELS[issue.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13.5px] font-semibold text-[#1D1D1F]">
                      {issue.title}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-[#6E6E73] tabular-nums">
                      <span>
                        {issue.reportCount}{" "}
                        {issue.reportCount === 1 ? "confirmation" : "confirmations"}
                      </span>
                      <span>{formatDate(issue.reportedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="flex flex-col gap-4 p-5">
          <PanelHeader
            title={`Issues You Confirmed (${votedEntries.length})`}
            description="Locations where you voted to verify an ongoing civic problem."
            icon={<ThumbsUp className="h-4 w-4" />}
          />

          {votedEntries.length === 0 ? (
            <EmptyState
              title="No confirmations yet"
              description="Open any issue record and confirm it still exists to add your voice."
              action={
                <Link
                  href="/civic-issues"
                  className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7]"
                >
                  Browse civic issues
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {votedEntries.map(({ issue, votedAt, note }) => (
                <li key={issue.id}>
                  <Link
                    href={`/civic-issues/${issue.id}`}
                    className="block rounded-[14px] border border-black/[0.06] bg-[#F9FAFB] p-3.5 transition-colors hover:bg-[#F0F2F5]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                        {issue.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] text-[#6E6E73] tabular-nums">
                          Confirmed {formatDate(votedAt)}
                        </span>
                        <Badge tone={issueStatusTone(issue.status)}>
                          {ISSUE_STATUS_LABELS[issue.status]}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-[13.5px] font-semibold text-[#1D1D1F]">
                      {issue.title}
                    </p>
                    {note ? (
                      <p className="mt-1 line-clamp-2 text-[12px] text-[#48484A]">
                        “{note}”
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* My Watchlist */}
      <Panel className="flex flex-col gap-4 p-5">
        <PanelHeader
          title="My Watchlist"
          description="Follow sectors, civic issues, and sanctioned projects to receive targeted notifications."
        />
        <div>
          <p className="text-[12px] font-semibold text-[#6E6E73]">Follow Dhaka Sectors</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-full border border-black/[0.07] bg-[#F9FAFB] py-1 pl-3 pr-1.5"
              >
                <span className="text-[12px] font-medium text-[#1D1D1F]">
                  {s.code} · {s.name}
                </span>
                <FollowButton
                  entityType="sector"
                  entityId={s.id}
                  initialFollowing={watchlist.sectors.includes(s.id)}
                  signedIn
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold text-[#6E6E73]">
              Followed Issues ({followedIssues.length})
            </p>
            {followedIssues.length === 0 ? (
              <p className="mt-2 rounded-[12px] bg-[#F5F5F7] px-3 py-4 text-[12.5px] text-[#6E6E73]">
                No issues followed yet. Click Follow on any issue file.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {followedIssues.map((iss) => (
                  <li key={iss.id}>
                    <Link
                      href={`/civic-issues/${iss.id}`}
                      className="flex items-center justify-between gap-2 rounded-[12px] border border-black/[0.06] bg-[#F9FAFB] px-3 py-2 text-[12.5px] hover:bg-[#F0F2F5]"
                    >
                      <span className="truncate font-medium text-[#1D1D1F]">
                        <span className="mr-1.5 font-semibold text-[#0055CC] tabular-nums">
                          {iss.code}
                        </span>
                        {iss.title}
                      </span>
                      <Badge tone={issueStatusTone(iss.status)}>
                        {ISSUE_STATUS_LABELS[iss.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[#6E6E73]">
              Followed Sanctioned Projects ({followedProjects.length})
            </p>
            {followedProjects.length === 0 ? (
              <p className="mt-2 rounded-[12px] bg-[#F5F5F7] px-3 py-4 text-[12.5px] text-[#6E6E73]">
                No sanctioned projects followed yet. Click Follow on any project ledger.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {followedProjects.map((proj) => (
                  <li key={proj.id}>
                    <Link
                      href={`/public-projects/${proj.id}`}
                      className="flex items-center justify-between gap-2 rounded-[12px] border border-black/[0.06] bg-[#F9FAFB] px-3 py-2 text-[12.5px] hover:bg-[#F0F2F5]"
                    >
                      <span className="truncate font-medium text-[#1D1D1F]">
                        <span className="mr-1.5 font-semibold text-[#0055CC] tabular-nums">
                          {proj.code}
                        </span>
                        {proj.name}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#86868B]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>

      {/* Personal Audit Trail */}
      <Panel className="p-5">
        <PanelHeader
          title={`Your Civic Audit Trail (${authoredEvents.length})`}
          description="Chronological log of reports, confirmations, and status transitions recorded under your name."
          icon={<Clock className="h-4 w-4" />}
        />

        {authoredEvents.length === 0 ? (
          <p className="mt-4 rounded-[14px] bg-[#F5F5F7] px-4 py-7 text-center text-[13px] text-[#6E6E73]">
            No timeline events authored under this profile yet.
          </p>
        ) : (
          <ol className="mt-4 ml-2 space-y-3.5 border-l border-black/[0.08] pl-4">
            {authoredEvents.slice(0, 15).map(({ issue, event }) => {
              const tone = issueStatusTone(event.status);
              return (
                <li key={event.id} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${TONES[tone].dot}`}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <Link
                      href={`/civic-issues/${issue.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#0055CC] hover:underline tabular-nums"
                    >
                      {issue.code} <ArrowRight className="h-3 w-3" />
                    </Link>
                    <span className="text-[#6E6E73] tabular-nums">{formatDate(event.at)}</span>
                    <Badge tone={tone}>{ISSUE_STATUS_LABELS[event.status]}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#48484A]">{event.note}</p>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}
