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
    <Panel glow className="flex flex-col gap-4 p-5">
      <PanelHeader
        title="Ask the Civic Record"
        description="Answers are grounded strictly in the stored project and issue dataset."
        icon={<MessageSquare className="h-4 w-4" />}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="flex flex-wrap items-center gap-2.5"
      >
        <label className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-full border border-black/[0.08] bg-[#F5F5F7] px-4 py-2.5 transition-colors focus-within:border-[#007AFF] focus-within:bg-white">
          <Sparkles className="h-4 w-4 shrink-0 text-[#007AFF]" />
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. Why has the link road been repaired three times?"
            aria-label="Ask a civic question"
            maxLength={300}
            className="w-full bg-transparent text-[14px] text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none"
          />
          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[#86868B]" />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {loading ? "Analyzing…" : "Ask"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-medium text-[#6E6E73]">Suggested</span>
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuestion(suggestion);
              void ask(suggestion);
            }}
            className="rounded-full bg-[#F0F2F5] px-3 py-1 text-[12px] font-medium text-[#48484A] transition-colors hover:bg-black/[0.08] hover:text-[#1D1D1F] cursor-pointer"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-[14px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3.5 py-2.5 text-[13px] text-[#C9241B]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {history.length === 0 && !loading ? (
        <p className="rounded-[16px] bg-[#F5F5F7] px-4 py-7 text-center text-[13px] text-[#6E6E73]">
          Ask a question or pick a prompt above. Every answer links directly to its source records.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {history.map((entry, index) => (
          <li
            key={`${entry.question}-${index}`}
            className="ct-fade-up rounded-[16px] border border-black/[0.06] bg-[#F9FAFB] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-[#1D1D1F]">
                {entry.question}
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  entry.source === "gemini"
                    ? "bg-[#007AFF]/[0.1] text-[#0055CC]"
                    : "bg-black/[0.05] text-[#6E6E73]"
                }`}
              >
                {entry.source === "gemini" ? "Gemini live" : "Rules engine"}
              </span>
            </div>

            <p className="mt-2 text-[13.5px] leading-relaxed text-[#1D1D1F]">{entry.answer}</p>

            {entry.citations.length > 0 ? (
              <div className="mt-3 border-t border-black/[0.05] pt-2.5">
                <p className="text-[11.5px] font-medium text-[#6E6E73]">Sources</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {entry.citations.map((citation) => (
                    <li key={citation.href}>
                      <Link
                        href={citation.href}
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#007AFF] hover:underline"
                      >
                        {citation.label}
                        <ArrowUpRight className="h-3 w-3" />
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
