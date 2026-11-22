import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Stronger cyan border + outer glow for focal panels. */
  glow?: boolean;
  /** Flatter surface for nested/inset content. */
  quiet?: boolean;
}

/** The single surface primitive every CITYTRACE module is built from. */
export function Panel({ children, className = "", glow = false, quiet = false }: PanelProps) {
  const surface = quiet ? "ct-panel-quiet" : "ct-panel";
  return (
    <div
      className={[
        "rounded-xl",
        surface,
        glow ? "ct-panel-glow" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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

/** Title row used at the top of most panels. */
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
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-mono text-[11px] font-semibold tracking-[0.16em] text-cyan-300 uppercase">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Small uppercase label for grouping rows inside a panel. */
export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase ${className}`}
    >
      {children}
    </p>
  );
}
