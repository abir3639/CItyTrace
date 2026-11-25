"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_ORDER, type IssueStatus } from "@/types/citytrace";
import { issueStatusTone, TONES } from "@/utils/formatters";

export default function IssueStatusControls({
  issueId,
  currentStatus,
}: {
  issueId: string;
  currentStatus: IssueStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<IssueStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === currentStatus && note.trim().length === 0) {
      setError("Pick a different status, or add a note for the record.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? `Update failed with HTTP ${response.status}.`);
        return;
      }

      setSaved(true);
      setNote("");
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <fieldset>
        <legend className="text-[12px] font-medium text-[#6E6E73]">Move to status</legend>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          {ISSUE_STATUS_ORDER.map((option) => {
            const active = status === option;
            const tone = issueStatusTone(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                aria-pressed={active}
                className={`flex items-center justify-between gap-2 rounded-[12px] border px-3 py-2 text-left text-[13px] font-medium transition-all cursor-pointer ${
                  active
                    ? "border-[#007AFF] bg-[#007AFF]/[0.08] text-[#0055CC]"
                    : "border-black/[0.06] bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${TONES[tone].dot}`} />
                  {ISSUE_STATUS_LABELS[option]}
                </span>
                {option === currentStatus ? (
                  <span className="text-[11px] font-medium text-[#86868B]">Current</span>
                ) : active ? (
                  <Check className="h-3.5 w-3.5 text-[#007AFF]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[#6E6E73]">Note for the record</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Describe what changed and why…"
          className="w-full resize-none rounded-[12px] border border-black/[0.08] bg-[#F5F5F7] px-3 py-2 text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] transition-colors focus:border-[#007AFF] focus:bg-white focus:outline-none"
        />
      </label>

      {error ? (
        <p className="rounded-[12px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3 py-2 text-[12px] text-[#C9241B]">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="rounded-[12px] border border-[#34C759]/25 bg-[#34C759]/[0.1] px-3 py-2 text-[12px] text-[#1A7F37]">
          Status recorded and appended to permanent history.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0066D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recording…
          </>
        ) : (
          "Record status change"
        )}
      </button>
    </form>
  );
}
