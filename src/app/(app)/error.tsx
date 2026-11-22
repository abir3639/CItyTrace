"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CITYTRACE route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/40 bg-red-950/40">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </span>
      <div>
        <h1 className="text-lg font-bold text-slate-50">This view failed to load</h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Something went wrong rendering this module. The civic dataset itself is
          unaffected — retry the view, or return to the overview.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-slate-500">ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-[11px] text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
