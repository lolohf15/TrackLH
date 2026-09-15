"use client";

import { cn } from "@/lib/utils";

export interface StackedSegment {
  color: string;
  value: number;
}

export interface StackedBar {
  key: string;
  /** Sits under the bar. Null leaves the slot blank — see `labelEvery`. */
  label: string | null;
  /** Largest first; the chart stacks them from the baseline up. */
  segments: StackedSegment[];
  total: number;
}

/**
 * One column per slice of the period, each column stacked by category.
 *
 * Unlike `BarChart`, which colors one bar and hatches the rest, every column
 * here carries hue — the stack *is* the information. Emphasis comes from
 * selection instead: picking a column dims the others so the readout above
 * has something to point at.
 */
export function StackedBarChart({
  bars,
  height = 128,
  reference,
  selectedKey,
  onSelect,
  className,
}: {
  bars: StackedBar[];
  /** Of the plot area in pixels; labels sit below it. */
  height?: number;
  /** A dashed line across the plot — the period's average, usually. */
  reference?: { value: number; label: string } | null;
  selectedKey?: string | null;
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
            className="absolute inset-x-0 flex items-center pointer-events-none"
            style={{ bottom: `${Math.min((reference.value / max) * 100, 100)}%` }}
          >
            <div className="flex-1 border-t border-dashed border-border-strong" />
            <span className="font-mono text-[8.5px] text-text-faint uppercase tracking-wide pl-1.5 -mt-px">
              {reference.label}
            </span>
          </div>
        )}

        <div className="flex items-end h-full" style={{ gap }}>
          {bars.map((bar) => {
            const dimmed = selectedKey != null && selectedKey !== bar.key;
            return (
              <button
                key={bar.key}
                type="button"
                onClick={() => onSelect?.(bar.key)}
                aria-pressed={selectedKey === bar.key}
                className={cn(
                  "flex-1 min-w-0 h-full flex flex-col justify-end transition-opacity duration-200 ease-out",
                  dimmed && "opacity-35",
                  !onSelect && "pointer-events-none"
                )}
              >
                {bar.total > 0 ? (
                  // Reversed so the largest category sits on the baseline and
                  // the stack reads the same way down the whole chart.
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
                        // A hairline of the card showing between neighbours,
                        // so two categories of similar hue still read as two.
                        // Inset rather than a border: it costs no height, and
                        // the thinnest segment can't afford any.
                        boxShadow: i > 0 ? "inset 0 1px 0 var(--color-surface)" : undefined,
                      }}
                    />
                  ))
                ) : (
                  <span className="block w-full h-[2px] rounded-full bg-surface-3" />
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
              selectedKey === bar.key ? "text-text-muted" : "text-text-faint"
            )}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
