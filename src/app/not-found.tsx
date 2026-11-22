import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/50">
        <Compass className="h-6 w-6 text-cyan-300" />
      </span>
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-400 uppercase">
          404 · Sector not mapped
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-50">This route does not exist</h1>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
          The page you asked for is not part of the CITYTRACE district model. Head
          back to the overview to explore the six civic modules.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
      >
        Return to overview
      </Link>
    </div>
  );
}
