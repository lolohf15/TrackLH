"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";

export interface LegendItem {
  label: string;
  color: string;
  /** A short stroke for a line series, a square for a filled one. */
  shape?: "square" | "line" | "dashed";
}

export interface ChartTableData {
  headers: string[];
  rows: Array<{ key: string; cells: string[] }>;
}

/**
 * The frame every trend chart sits in: an eyebrow and its legend, the plot,
 * a readout for whatever is picked, and the same figures as a table one tap
 * away. The table is the chart's accessible twin — every value the plot
 * shows is reachable there without aiming at a column — and the summary is
 * what a screen reader hears instead of the drawing.
 */
export function ChartCard({
  title,
  hint,
  legend,
  summary,
  table,
  readout,
  children,
  className,
}: {
  title: string;
  hint?: string;
  legend?: LegendItem[];
  /** One or two sentences that say what the chart shows. */
  summary: string;
  table?: ChartTableData;
  readout?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useT();
  const id = useId();
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={cn("panel px-4 py-3.5 mt-3", className)} aria-labelledby={`${id}-title`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 id={`${id}-title`} className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {title}
        </h3>
        {legend && legend.length > 0 && (
          <ul className="flex items-center gap-3 flex-wrap">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 font-mono text-[9.5px] text-text-muted uppercase tracking-wide">
                <LegendKey {...item} />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <p className="text-[11.5px] text-text-dim leading-relaxed mb-1">{hint}</p>}

      <p className="sr-only">{summary}</p>
      <div aria-hidden={showTable}>{children}</div>

      {readout && <div className="mt-3 pt-3 border-t border-divider">{readout}</div>}

      {table && (
        <>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            className="press mt-2 -mb-1 min-h-[36px] font-mono text-[10px] font-medium text-text-dim hover:text-text uppercase tracking-wide"
          >
            {showTable ? t.analytics.hideTable : t.analytics.showTable}
          </button>
          {showTable && (
            <div className="overflow-x-auto -mx-4 px-4 pb-1">
              <table className="w-full text-[12px] tabular-nums">
                <thead>
                  <tr className="text-left">
                    {table.headers.map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          "font-mono text-[9.5px] font-semibold text-text-dim uppercase tracking-wide py-1.5 pr-3 whitespace-nowrap",
                          i > 0 && "text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row.key} className="border-t border-divider">
                      {row.cells.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" className="text-left font-normal text-text-muted py-1.5 pr-3 whitespace-nowrap">
                            {cell}
                          </th>
                        ) : (
                          <td key={i} className="text-right text-text py-1.5 pr-3 whitespace-nowrap">
                            {cell}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LegendKey({ color, shape = "square" }: LegendItem) {
  if (shape === "square") {
    return <span aria-hidden="true" className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: color }} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("w-3.5 shrink-0", shape === "dashed" ? "border-t border-dashed" : "border-t-2")}
      style={{ borderColor: color }}
    />
  );
}

/** A label and its figure, the unit every readout is made of. */
export function ReadoutFigure({
  label, value, tone, swatch,
}: { label: string; value: string; tone?: string; swatch?: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9.5px] font-semibold text-text-dim uppercase tracking-[0.08em] flex items-center gap-1.5">
        {swatch && <span aria-hidden="true" className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: swatch }} />}
        {label}
      </p>
      <p className={cn("text-[15px] font-semibold tabular-nums mt-0.5", tone ?? "text-text")}>{value}</p>
    </div>
  );
}
