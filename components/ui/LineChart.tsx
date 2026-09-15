"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface LinePoint {
  key: string;
  /** Sits under the plot. Null leaves the slot blank on a dense axis. */
  label: string | null;
  value: number;
}

/** Room above the highest point, in the same units as the plot, so the
 *  readout bubble has somewhere to sit without leaving the card. */
const HEADROOM = 24;

/**
 * A line over an area fade, with one point called out: a dot, a thread down
 * to the axis, and the figure in a bubble above it.
 *
 * Drawn in a 100×100 box stretched to fit, which keeps the maths to two
 * lines — every stroke carries `non-scaling-stroke` so nothing thickens on
 * the way out, and the dot, thread and bubble are HTML at a percentage
 * offset rather than SVG, so they stay round, crisp and readable.
 */
export function LineChart({
  points,
  comparison,
  color = "var(--color-accent)",
  height = 160,
  selectedKey,
  onSelect,
  format,
  className,
}: {
  points: LinePoint[];
  /** A second series, dashed and muted — the same span a period earlier. */
  comparison?: number[] | null;
  color?: string;
  height?: number;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** How the called-out value is written in the bubble. */
  format: (value: number) => string;
  className?: string;
}) {
  const id = useId();
  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), ...(comparison ?? []), 1);

  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const y = (value: number) => HEADROOM + (1 - value / max) * (100 - HEADROOM);

  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const line = path(points.map((p) => p.value));
  const area = `${line} L ${x(n - 1)} 100 L ${x(0)} 100 Z`;

  const selected = Math.max(points.findIndex((p) => p.key === selectedKey), -1);
  const active = selected >= 0 ? points[selected] : null;
  // Pulled off the edges so a bubble at either end stays inside the card.
  const bubbleX = active ? Math.min(Math.max(x(selected), 15), 85) : 0;

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {n > 1 && <path d={area} fill={`url(#${id}-fill)`} />}

          {comparison && comparison.length > 1 && (
            <path
              d={path(comparison)}
              fill="none"
              stroke="var(--color-text-faint)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {active && (
          <>
            {/* The thread: it ties the figure above to the date below. */}
            <span
              className="absolute w-px -translate-x-1/2 pointer-events-none"
              style={{
                left: `${x(selected)}%`,
                top: `${y(active.value)}%`,
                bottom: 0,
                background:
                  "linear-gradient(to bottom, color-mix(in srgb, var(--color-text) 45%, transparent), transparent)",
              }}
            />
            <span
              className="absolute w-[11px] h-[11px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${x(selected)}%`,
                top: `${y(active.value)}%`,
                background: "var(--color-surface)",
                border: "3px solid var(--color-text)",
              }}
            />
            <span
              className="absolute -translate-x-1/2 -translate-y-[150%] pointer-events-none whitespace-nowrap rounded-full bg-text text-bg px-2.5 py-1 text-[11.5px] font-semibold tabular-nums shadow-float"
              style={{ left: `${bubbleX}%`, top: `${y(active.value)}%` }}
            >
              {format(active.value)}
            </span>
          </>
        )}

        {/* One invisible column per point, so tapping anywhere near one
            picks it — the dot itself is an eleven-pixel target. */}
        {onSelect && (
          <div className="absolute inset-0 flex">
            {points.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-label={p.label ?? p.key}
                aria-pressed={p.key === selectedKey}
                onClick={() => onSelect(p.key)}
                className="flex-1 min-w-0 h-full"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex mt-2">
        {points.map((p) => (
          <span
            key={p.key}
            className={cn(
              "flex-1 min-w-0 font-mono text-[9px] uppercase text-center whitespace-nowrap",
              p.key === selectedKey ? "text-text-muted" : "text-text-faint"
            )}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
