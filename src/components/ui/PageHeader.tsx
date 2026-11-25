import type { ReactNode } from "react";
import { DemoBadge } from "./Badge";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** Show the subtle simulated-data disclosure. Defaults to true. */
  showDemoBadge?: boolean;
}

/** Clean Apple-inspired page header block used across CityTrace routes. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  showDemoBadge = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] font-medium text-[#007AFF]">{eyebrow}</p>
          {showDemoBadge ? <DemoBadge /> : null}
        </div>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] leading-tight text-[#1D1D1F] sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[#6E6E73]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}
