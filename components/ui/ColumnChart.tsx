"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ColumnSegment {
  value: number;
  color: string;
}

export interface ColumnGroup {
  key: string;
  /** Sits under the group. Null leaves the slot blank on a dense axis. */
  label: string | null;
  /** Side by side within the group, each one stacked from the baseline up. */
  columns: ColumnSegment[][];
  /** Still running, so drawn faint and reached by a dashed line. */
  partial?: boolean;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Columns per slice of time — one per group, or a pair side by side, each
 * free to stack — with an optional line laid over them on the same scale.
 *
 * Every group carries its colour, unlike `StackedBarChart`, where one column
 * is lit and the rest are hatched: here the comparison between groups is the
 * point. The picked group stays at full strength and the others step back, so
 * the readout below still has one thing it's describing.
 *
 * One axis only. The line has to be in the same units as the columns (net
 * against income and spending, say); it can dip below zero, and the baseline
 * moves up to make room when it does.
 */
export function ColumnChart({
  groups,
  line,
  reference,
  selectedKey,
  onSelect,
  height = 140,
  label,
  className,
}: {
  groups: ColumnGroup[];
  /** One value per group, drawn as a line with a dot on each. */
  line?: { values: number[]; color: string } | null;
  /** A dashed line across the plot, labelled on the left. */
  reference?: { value: number; label: string } | null;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** Of the plot area in pixels; labels sit below it. */
  height?: number;
  /** Names each group's hit target for a screen reader: "Sep 2026". */
  label?: (key: string) => string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const n = groups.length;

  const totals = groups.flatMap((g) => g.columns.map((c) => c.reduce((s, x) => s + Math.max(0, x.value), 0)));
  const lineValues = line?.values ?? [];
  const max = Math.max(1, ...totals, ...lineValues, reference?.value ?? 0);
  const min = Math.min(0, ...lineValues);
  const span = max - min;
  /** Percent from the bottom of the plot. */
  const at = (value: number) => ((value - min) / span) * 100;
  const zero = at(0);

  const x = (i: number) => ((i + 0.5) / n) * 100;
  // The line runs solid through the finished groups and dashed into the
  // first partial one, so a half-done month can't drag it down unremarked.
  const firstPartial = groups.findIndex((g) => g.partial);
  const solidUntil = firstPartial > 0 ? firstPartial - 1 : firstPartial === 0 ? 0 : lineValues.length - 1;
  const toPath = (values: number[], offset: number) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i + offset)} ${100 - at(v)}`).join(" ");
  const linePath = toPath(lineValues.slice(0, solidUntil + 1), 0);
  const dashedPath = firstPartial >= 0 ? toPath(lineValues.slice(solidUntil), solidUntil) : null;

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        {/* The baseline: a hairline, solid, one step off the surface. */}
        <div
          className="absolute inset-x-0 border-t border-border"
          style={{ bottom: `${zero}%` }}
          aria-hidden="true"
        />

        {reference && reference.value > 0 && (
          <div
            className="absolute inset-x-0 z-10 flex items-center pointer-events-none"
            style={{ bottom: `${at(reference.value)}%` }}
            aria-hidden="true"
          >
            <span className="font-mono text-[8.5px] text-text-faint uppercase tracking-wide bg-surface shrink-0 pr-1.5 -mt-px">
              {reference.label}
            </span>
            <div className="flex-1 border-t border-dashed border-border-strong" />
          </div>
        )}

        <div className="absolute inset-0 flex">
          {groups.map((group, gi) => {
            const dim = selectedKey != null && group.key !== selectedKey;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => onSelect?.(group.key)}
                aria-pressed={group.key === selectedKey}
                aria-label={label?.(group.key) ?? group.label ?? group.key}
                className={cn(
                  "relative flex-1 min-w-0 h-full flex justify-center gap-[2px]",
                  !onSelect && "pointer-events-none"
                )}
              >
                {group.columns.map((stack, ci) => {
                  const total = stack.reduce((s, x) => s + Math.max(0, x.value), 0);
                  return (
                    // Capped at 24px: a column that fills its slot reads as a
                    // block, and the air between groups is what separates them.
                    <span key={ci} className="relative h-full flex-1 max-w-[24px]">
                      {total > 0 ? (
                        <motion.span
                          className="absolute inset-x-0 flex flex-col-reverse gap-[2px] origin-bottom transition-opacity duration-200"
                          style={{
                            bottom: `${zero}%`,
                            height: `${(total / span) * 100}%`,
                            opacity: (dim ? 0.55 : 1) * (group.partial ? 0.45 : 1),
                          }}
                          initial={reduceMotion ? false : { scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.5, ease: EASE_OUT, delay: gi * 0.035 }}
                        >
                          {stack.map((segment, si) =>
                            segment.value > 0 ? (
                              <span
                                key={si}
                                className={cn("block w-full shrink-0", si === lastFilled(stack) && "rounded-t-[4px]")}
                                style={{
                                  // Shares of what's left after the 2px gaps,
                                  // so a thin segment still shows.
                                  flexGrow: segment.value,
                                  flexBasis: 0,
                                  minHeight: 2,
                                  background: segment.color,
                                }}
                              />
                            ) : null
                          )}
                        </motion.span>
                      ) : (
                        // Nothing in it still holds its place, as nothing.
                        <span
                          className="absolute inset-x-0 h-[2px] rounded-full bg-surface-3"
                          style={{ bottom: `${zero}%` }}
                        />
                      )}
                    </span>
                  );
                })}
              </button>
            );
          })}
        </div>

        {line && lineValues.length > 0 && (
          <>
            {/* Drawn in left to right by uncovering it, not by animating the
                stroke's length: a non-scaling stroke measures its dashes in
                screen pixels and its length in the stretched box, so a
                pathLength animation stops partway across. */}
            <motion.svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
              initial={reduceMotion ? false : { clipPath: "inset(-10% 100% -10% 0)" }}
              animate={{ clipPath: "inset(-10% 0% -10% 0)" }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}
            >
              <path
                d={linePath}
                fill="none"
                stroke={line.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {dashedPath && (
                <path
                  d={dashedPath}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  opacity={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </motion.svg>
            {lineValues.map((v, i) => (
              <span
                key={groups[i]?.key ?? i}
                aria-hidden="true"
                className="absolute w-[9px] h-[9px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none transition-opacity duration-200"
                style={{
                  left: `${x(i)}%`,
                  bottom: `${at(v)}%`,
                  background: line.color,
                  // The surface ring keeps a dot legible where it sits on a column.
                  boxShadow: "0 0 0 2px var(--color-surface)",
                  opacity:
                    (selectedKey != null && groups[i]?.key !== selectedKey ? 0.5 : 1) *
                    (groups[i]?.partial ? 0.6 : 1),
                }}
              />
            ))}
          </>
        )}
      </div>

      <div className="flex mt-2">
        {groups.map((g) => (
          <span
            key={g.key}
            className={cn(
              "flex-1 min-w-0 font-mono text-[9px] uppercase text-center whitespace-nowrap",
              g.key === selectedKey ? "text-text-muted" : "text-text-faint"
            )}
          >
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function lastFilled(stack: ColumnSegment[]): number {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].value > 0) return i;
  return -1;
}
