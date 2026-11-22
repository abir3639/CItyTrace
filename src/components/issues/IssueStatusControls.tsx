"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_ORDER, type IssueStatus } from "@/types/citytrace";
import { issueStatusTone, TONES } from "@/utils/formatters";

/**
 * Status management for a single issue.
 *
 * Every change is appended to the issue's permanent history by the API — no
 * update overwrites the record of how it got there.
 */
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
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <fieldset>
        <legend className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Move to status
        </legend>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5">
          {ISSUE_STATUS_ORDER.map((option) => {
            const active = status === option;
            const tone = issueStatusTone(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                aria-pressed={active}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors cursor-pointer ${
                  active
                    ? `border-cyan-400/60 bg-cyan-500/10 text-cyan-100`
                    : "border-slate-800 bg-[#08101d] text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} />
                  {ISSUE_STATUS_LABELS[option]}
                </span>
                {option === currentStatus ? (
                  <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                    current
                  </span>
                ) : active ? (
                  <Check className="h-3 w-3 text-cyan-300" />
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Note for the record
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="What changed, and why? This is stored permanently with the issue."
          className="w-full resize-none rounded-lg border border-slate-800 bg-[#07101d] px-2.5 py-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
        />
      </label>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-950/30 px-2 py-1.5 text-[10px] text-red-200">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="rounded border border-emerald-500/40 bg-emerald-950/30 px-2 py-1.5 text-[10px] text-emerald-200">
          Status recorded and appended to the permanent history.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
