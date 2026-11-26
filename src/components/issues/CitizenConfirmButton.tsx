"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ThumbsUp } from "lucide-react";
import type { IssueStatus } from "@/types/citytrace";

export default function CitizenConfirmButton({
  issueId,
  reportCount,
  status,
}: {
  issueId: string;
  reportCount: number;
  status: IssueStatus;
}) {
  const router = useRouter();
  const [count, setCount] = useState(reportCount);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isResolved = status === "resolved";

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    setConfirmed(false);

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", note }),
      });

      const payload = (await response.json()) as {
        issue?: { reportCount: number };
        error?: string;
      };

      if (!response.ok || !payload.issue) {
        setError(payload.error ?? `Confirmation failed with HTTP ${response.status}.`);
        return;
      }

      setCount(payload.issue.reportCount);
      setNote("");
      setConfirmed(true);
      router.refresh();
      window.setTimeout(() => setConfirmed(false), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[#F5F5F7] px-3.5 py-2.5">
        <span className="text-[12.5px] text-[#6E6E73]">Verified citizen reports</span>
        <span className="text-[16px] font-semibold text-[#1D1D1F] tabular-nums">{count}</span>
      </div>

      <input
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={200}
        placeholder="Brief on-site note (optional)…"
        aria-label="Optional citizen verification note"
        className="w-full rounded-[12px] border border-black/[0.08] bg-[#F5F5F7] px-3 py-2 text-[12.5px] text-[#1D1D1F] placeholder:text-[#86868B] transition-colors focus:border-[#007AFF] focus:bg-white focus:outline-none"
      />

      {error ? (
        <p className="rounded-[12px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3 py-2 text-[12px] text-[#C9241B]">
          {error}
        </p>
      ) : null}

      {confirmed ? (
        <p className="flex items-center gap-1.5 rounded-[12px] border border-[#34C759]/25 bg-[#34C759]/[0.1] px-3 py-2 text-[12px] text-[#1A7F37]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Confirmation added to the permanent trail.
        </p>
      ) : null}

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
    </div>
  );
}
