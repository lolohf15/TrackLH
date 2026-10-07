"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The frame every chart on Inicio and Analytics sits in: what it is and the
 * figure it adds up to on one line, the plot, then a line that reads out
 * whatever is picked. No explanatory paragraph: if a chart needs one, the
 * chart is wrong.
 */
export function ChartPanel({
  title,
  aside,
  children,
  readout,
  className,
}: {
  title: string;
  /** The right side of the title line: a total, a scale note. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  /** Live: announced when the pick changes. */
  readout?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("panel px-4 pt-3.5 pb-3 flex flex-col gap-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] truncate">
          {title}
        </h2>
        {aside && <div className="shrink-0 text-right">{aside}</div>}
      </div>
      {children}
      {readout !== undefined && (
        <p aria-live="polite" className="text-[12.5px] leading-snug text-text-muted min-h-[18px]">
          {readout}
        </p>
      )}
    </section>
  );
}

/** The total on a chart's title line. */
export function PanelFigure({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-semibold text-text tabular-nums">{children}</span>;
}

/** A quieter note on a chart's title line. */
export function PanelNote({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-text-dim tabular-nums">{children}</span>;
}
