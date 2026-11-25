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
    console.error("CityTrace route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF3B30]/[0.1] text-[#C9241B]">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
          This view failed to load
        </h1>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#6E6E73]">
          Something went wrong rendering this module. The civic dataset itself is unaffected.
        </p>
        {error.digest ? (
          <p className="mt-2 text-[12px] text-[#86868B] tabular-nums">Ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0066D6] cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
