import type { ReactNode } from "react";
import { DemoBadge } from "./Badge";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** Show the standing simulated-data disclosure. Defaults to true. */
  showDemoBadge?: boolean;
}

/** Consistent page title block used by every route. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  showDemoBadge = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-400 uppercase">
            {eyebrow}
          </p>
          {showDemoBadge ? <DemoBadge /> : null}
        </div>
        <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400 sm:text-[13px]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
