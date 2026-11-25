import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Elevated crisp card shadow for focal surfaces. */
  glow?: boolean;
  /** Soft inset surface (#F5F5F7) for nested content. */
  quiet?: boolean;
}

/** Primary white surface primitive used across CityTrace modules. */
export function Panel({
  children,
  className = "",
  glow = false,
  quiet = false,
}: PanelProps) {
  const surface = quiet
    ? "ct-surface-inset rounded-[16px]"
    : glow
      ? "ct-surface-elevated rounded-[20px]"
      : "ct-surface rounded-[20px]";
  return (
    <div className={[surface, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Clean editorial title row used at the top of cards and panels. */
export function PanelHeader({
  title,
  description,
  icon,
  actions,
  className = "",
}: PanelHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#1D1D1F]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[#1D1D1F]">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#6E6E73]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Small section label for grouping rows inside a panel. */
export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[12px] font-medium text-[#6E6E73] ${className}`}>
      {children}
    </p>
  );
}
