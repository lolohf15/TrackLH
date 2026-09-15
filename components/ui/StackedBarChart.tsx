"use client";

import { cn } from "@/lib/utils";

export interface StackedSegment {
  color: string;
  value: number;
}

export interface StackedBar {
  key: string;
  /** Sits under the bar. Null leaves the slot blank — see the axis notes. */
  label: string | null;
  /** Largest first; the chart stacks them from the baseline up. */
  segments: StackedSegment[];
  total: number;
}

/**
 * Columns over a period, with exactly one of them carrying colour.
 *
 * The rest are hatched rather than tinted: texture holds the height — which
 * is the comparison — without putting five more hues on screen to compete
 * with the one bar being talked about. The lit column shows its own stack,
 * so what it's made of is legible in the same glance as how big it is, and
 * a cap floats above it to say *that one* even where the colour is subtle.
 */
export function StackedBarChart({
  bars,
  height = 128,
  reference,
  highlightKey,
  onSelect,
  className,
}: {
  bars: StackedBar[];
  /** Of the plot area in pixels; labels sit below it. */
  height?: number;
  /** A dashed line across the plot — the period's average, usually. */
  reference?: { value: number; label: string } | null;
  /** The one column in colour. Nothing lit if it matches no bar. */
  highlightKey?: string | null;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const max = Math.max(...bars.map((b) => b.total), 1);
  // Thirty-one days at phone width leave about ten pixels a column, so the
  // gap has to give way before the bars do.
  const gap = bars.length <= 7 ? 8 : bars.length <= 14 ? 5 : bars.length <= 31 ? 3 : 2;

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        {reference && reference.value > 0 && (
          <div
            // Over the bars, not under them: a reference line is only useful
            // where it crosses something, and its label was being painted
            // over by whatever column stood at the left edge.
            className="absolute inset-x-0 z-10 flex items-center pointer-events-none"
            style={{ bottom: `${Math.min((reference.value / max) * 100, 100)}%` }}
          >
            {/* Labelled on the left, where no bar ever reaches: the right end
                of the plot is where the newest — and usually the lit —
                column stands. */}
            <span className="font-mono text-[8.5px] text-text-faint uppercase tracking-wide bg-surface shrink-0 pr-1.5 -mt-px">
              {reference.label}
            </span>
            <div className="flex-1 border-t border-dashed border-border-strong" />
          </div>
        )}

        <div className="flex items-end h-full" style={{ gap }}>
          {bars.map((bar) => {
            const lit = bar.key === highlightKey;
            const pct = (bar.total / max) * 100;

            return (
              <button
                key={bar.key}
                type="button"
                onClick={() => onSelect?.(bar.key)}
                aria-pressed={lit}
                className={cn(
                  "relative flex-1 min-w-0 h-full flex flex-col justify-end",
                  !onSelect && "pointer-events-none"
                )}
              >
                {lit && bar.total > 0 && (
                  <span
                    className="absolute inset-x-0 h-[3px] rounded-full bg-text transition-[bottom] duration-300 ease-out"
                    style={{ bottom: `calc(${pct}% + 6px)` }}
                  />
                )}

                {bar.total === 0 ? (
                  // An empty slice still holds its place in the week, so it
                  // reads as nothing spent rather than as nothing recorded.
                  <span className="block w-full h-[2px] rounded-full bg-surface-3" />
                ) : lit ? (
                  // Reversed so the largest category sits on the baseline.
                  [...bar.segments].reverse().map((segment, i) => (
                    <span
                      key={i}
                      className={cn(
                        "block w-full transition-[height] duration-300 ease-out",
                        i === bar.segments.length - 1 && "rounded-t-[3px]"
                      )}
                      style={{
                        height: `${(segment.value / max) * 100}%`,
                        background: segment.color,
                        // A category worth a rounding error still has to be
                        // visible, or the stack stops adding up on screen.
                        minHeight: 2,
                        // A hairline of the card between neighbours, so two
                        // categories of similar hue still read as two. Inset
                        // rather than a border: it costs no height, and the
                        // thinnest segment can't afford any.
                        boxShadow: i > 0 ? "inset 0 1px 0 var(--color-surface)" : undefined,
                      }}
                    />
                  ))
                ) : (
                  <span
                    className="hatch block w-full rounded-t-[3px] transition-[height] duration-300 ease-out"
                    style={{ height: `${pct}%`, minHeight: 2 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex mt-2" style={{ gap }}>
        {bars.map((bar) => (
          <span
            key={bar.key}
            // Not truncated: on a dense chart most slots are blank, and a
            // label centred over a ten-pixel column needs to spill into
            // them rather than be cut down to one letter.
            className={cn(
              "flex-1 min-w-0 font-mono text-[9px] uppercase text-center whitespace-nowrap",
              bar.key === highlightKey ? "text-text-muted" : "text-text-faint"
            )}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
