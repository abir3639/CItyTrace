"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LogIn, ThumbsUp, Undo2 } from "lucide-react";
import { canUserPerform } from "@/lib/permissions";
import type { IssueStatus, IssueVote, PublicUser } from "@/types/citytrace";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import PermissionLockBanner from "@/components/governance/PermissionLockBanner";
import { formatDate } from "@/utils/formatters";

export default function CitizenConfirmButton({
  issueId,
  reportCount,
  status,
  votes,
  currentUser,
  demoEnabled = true,
}: {
  issueId: string;
  reportCount: number;
  status: IssueStatus;
  votes: IssueVote[];
  currentUser: PublicUser | null;
  demoEnabled?: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(reportCount);
  const [voteList, setVoteList] = useState<IssueVote[]>(votes);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedFlash, setConfirmedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isResolved = status === "resolved";
  const votePerm = canUserPerform(currentUser, "vote_issue");
  const hasVoted = Boolean(currentUser && voteList.some((v) => v.userId === currentUser.id));
  const extraCommunityCount = Math.max(0, count - voteList.length);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    setConfirmedFlash(false);

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", note }),
      });

      const payload = (await response.json()) as {
        issue?: { reportCount: number; votes?: IssueVote[] };
        error?: string;
      };

      if (!response.ok || !payload.issue) {
        if (payload.issue) {
          setCount(payload.issue.reportCount);
          if (payload.issue.votes) setVoteList(payload.issue.votes);
        }
        setError(payload.error ?? `Confirmation failed with HTTP ${response.status}.`);
        return;
      }

      setCount(payload.issue.reportCount);
      if (payload.issue.votes) setVoteList(payload.issue.votes);
      setNote("");
      setConfirmedFlash(true);
      router.refresh();
      window.setTimeout(() => setConfirmedFlash(false), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setSubmitting(true);
    setError(null);
    setConfirmedFlash(false);

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unconfirm" }),
      });

      const payload = (await response.json()) as {
        issue?: { reportCount: number; votes?: IssueVote[] };
        error?: string;
      };

      if (!response.ok || !payload.issue) {
        setError(payload.error ?? `Could not withdraw vote.`);
        return;
      }

      setCount(payload.issue.reportCount);
      if (payload.issue.votes) setVoteList(payload.issue.votes);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Total & avatar stack */}
      <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[#F5F5F7] px-3.5 py-2.5">
        <div>
          <span className="block text-[12px] font-medium text-[#6E6E73]">
            Verified confirmations
          </span>
          {voteList.length > 0 ? (
            <div className="mt-1.5 flex items-center">
              <div className="flex -space-x-1.5">
                {voteList.slice(0, 5).map((vote) => (
                  <UserAvatar
                    key={vote.userId}
                    initials={vote.userInitials}
                    color={vote.avatarColor}
                    size="xs"
                    title={`${vote.userName} (${formatDate(vote.votedAt)})`}
                  />
                ))}
              </div>
              {extraCommunityCount > 0 ? (
                <span className="ml-2 text-[11px] text-[#6E6E73] tabular-nums">
                  +{extraCommunityCount} walk-in reports
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <span className="text-[20px] font-semibold text-[#1D1D1F] tabular-nums">{count}</span>
      </div>

      {/* Action controls */}
      {!currentUser ? (
        <div className="flex flex-col gap-2 rounded-[14px] border border-[#007AFF]/20 bg-[#007AFF]/[0.06] p-3">
          <p className="text-[12px] leading-snug text-[#48484A]">
            Sign in so your confirmation vote and on-site observation are credited publicly.
          </p>
          <Link
            href={`/login?next=/civic-issues/${issueId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[12.5px] font-semibold text-white shadow-xs transition-all hover:bg-[#0066D6]"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in to confirm (+1)
          </Link>
        </div>
      ) : !votePerm.allowed ? (
        <PermissionLockBanner
          title="Citizen Voting Disabled for Officials"
          reason={
            votePerm.reason ??
            "Official accounts cannot cast citizen confirmation votes."
          }
          requiredRole="citizen"
          demoEnabled={demoEnabled}
        />
      ) : hasVoted ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[#34C759]/25 bg-[#34C759]/[0.1] px-3 py-2 text-[12.5px] font-medium text-[#1A7F37]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              You confirmed this issue
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#6E6E73] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Undo2 className="h-3 w-3" />
            )}
            Withdraw confirmation
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="Brief on-site note (optional)…"
            aria-label="Optional citizen verification note"
            className="w-full rounded-[12px] border border-black/[0.08] bg-[#F5F5F7] px-3 py-2 text-[12.5px] text-[#1D1D1F] placeholder:text-[#86868B] transition-colors focus:border-[#007AFF] focus:bg-white focus:outline-none"
          />

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-semibold text-[#1D1D1F] shadow-sm transition-all hover:bg-[#F5F5F7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007AFF]" /> Recording…
              </>
            ) : (
              <>
                <ThumbsUp className="h-3.5 w-3.5 text-[#007AFF]" />
                {isResolved ? "Report issue returned (+1)" : "Confirm still exists (+1)"}
              </>
            )}
          </button>
        </>
      )}

      {error ? (
        <p className="rounded-[12px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3 py-2 text-[12px] text-[#C9241B]">
          {error}
        </p>
      ) : null}

      {confirmedFlash ? (
        <p className="flex items-center gap-1.5 rounded-[12px] border border-[#34C759]/25 bg-[#34C759]/[0.1] px-3 py-2 text-[12px] text-[#1A7F37]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Confirmation added to the permanent trail.
        </p>
      ) : null}

      {/* Named voters list */}
      {voteList.length > 0 ? (
        <div className="border-t border-black/[0.06] pt-3">
          <p className="text-[11.5px] font-semibold text-[#6E6E73]">
            Confirmed by ({voteList.length} named)
          </p>
          <ul className="mt-2 space-y-2">
            {voteList.map((vote) => (
              <li
                key={vote.userId}
                className="flex items-start gap-2 rounded-[12px] bg-[#F9FAFB] px-2.5 py-2"
              >
                <UserAvatar
                  initials={vote.userInitials}
                  color={vote.avatarColor}
                  size="xs"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="truncate text-[12px] font-semibold text-[#1D1D1F]">
                      {vote.userName}
                    </span>
                    <RolePill role={vote.userRole} />
                  </div>
                  {vote.note ? (
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[#48484A]">
                      “{vote.note}”
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10.5px] text-[#86868B] tabular-nums">
                    {formatDate(vote.votedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
