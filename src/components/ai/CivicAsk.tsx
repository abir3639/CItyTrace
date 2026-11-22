"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CornerDownLeft,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { SUGGESTED_QUESTIONS, type AskAnswer } from "@/lib/ask";

/**
 * Civic Q&A.
 *
 * Answers come from `/api/ask`, which always produces a grounded answer from
 * the dataset — Gemini only rephrases it when a key is configured.
 */
export default function CivicAsk() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AskAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError("Ask a question of at least 3 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = (await response.json()) as AskAnswer | { error?: string };

      if (!response.ok || !("answer" in payload)) {
        setError(
          "error" in payload && payload.error
            ? payload.error
            : `The question failed with HTTP ${response.status}.`
        );
        return;
      }

      setHistory((previous) => [payload, ...previous].slice(0, 6));
      setQuestion("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel glow className="flex flex-col gap-3 p-4">
      <PanelHeader
        title="Ask the civic record"
        description="Questions are answered from the stored dataset only — every figure comes from a record you can open."
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        actions={
          <span className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-amber-200 uppercase">
            Simulated data
          </span>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-800 bg-[#07101d] px-2.5 py-2 focus-within:border-cyan-500/60">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. Why has the link road been repaired three times?"
            aria-label="Ask a civic question"
            maxLength={300}
            className="w-full bg-transparent font-mono text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <CornerDownLeft className="h-3 w-3 shrink-0 text-slate-600" />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/60 bg-gradient-to-r from-cyan-500 to-sky-500 px-3.5 py-2 font-mono text-[11px] font-bold tracking-wider text-slate-950 uppercase shadow-[0_0_20px_-6px_rgba(34,211,238,0.7)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {loading ? "Reading record…" : "Ask"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">Try</span>
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuestion(suggestion);
              void ask(suggestion);
            }}
            className="rounded-full border border-slate-700 px-2 py-0.5 font-mono text-[10px] text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 cursor-pointer"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {error ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-500/40 bg-red-950/30 px-2.5 py-2 text-[11px] text-red-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {history.length === 0 && !loading ? (
        <p className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/30 px-3 py-6 text-center font-mono text-[10px] leading-relaxed text-slate-500">
          No question asked yet. Every answer is assembled from the project and
          issue records — nothing is generated from outside the dataset.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {history.map((entry, index) => (
          <li
            key={`${entry.question}-${index}`}
            className="ct-fade-up rounded-lg border border-slate-800 bg-[#08101d] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-slate-200">
                <span className="mr-1.5 font-mono text-[10px] text-cyan-400">Q</span>
                {entry.question}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${
                  entry.source === "gemini"
                    ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-600/60 bg-slate-500/15 text-slate-300"
                }`}
              >
                {entry.source === "gemini" ? "Gemini · live" : "Rules engine"}
              </span>
            </div>

            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-100">{entry.answer}</p>

            {entry.citations.length > 0 ? (
              <div className="mt-2 border-t border-slate-800/80 pt-1.5">
                <p className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                  Sources
                </p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {entry.citations.map((citation) => (
                    <li key={citation.href}>
                      <Link
                        href={citation.href}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-300 hover:text-cyan-100"
                      >
                        {citation.label}
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
