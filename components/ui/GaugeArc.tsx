"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const R = 82;
const CX = 100;
const CY = 100;
const ARC_LENGTH = Math.PI * R;
const TICKS = 27;

function pointAt(percent: number, radius: number) {
  // The sweep runs right-to-left in maths and left-to-right on screen, which
  // is why the angle counts down from π rather than up from zero.
  const angle = Math.PI * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

/**
 * A dial: shallow arc, a comb of ticks riding above it, and a knob sitting
 * where the value falls. Where a bar answers "how much", this answers "how
 * far along" — a share of something with a fixed ceiling, like a month's
 * income kept or a budget's line.
 */
export function GaugeArc({
  percent,
  color = "var(--color-green)",
  children,
  className,
}: {
  /** 0–100, clamped. */
  percent: number;
  color?: string;
  /** Sits under the arc, inside its arms. */
  children?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const value = Math.min(Math.max(percent, 0), 100);
  const knob = pointAt(value, R);
  const litTicks = Math.round((value / 100) * TICKS);

  return (
    <div className={cn("relative w-full", className)}>
      <svg viewBox="0 0 200 116" className="w-full block overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* The comb, outside the arc: it gives the sweep a scale to be read
            against without printing a single number. */}
        {Array.from({ length: TICKS }, (_, i) => {
          const at = (i / (TICKS - 1)) * 100;
          const inner = pointAt(at, R + 9);
          const outer = pointAt(at, R + 15);
          return (
            <line
              key={i}
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={i < litTicks ? color : "var(--color-border-strong)"}
              strokeOpacity={i < litTicks ? 0.55 : 1}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}

        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={`url(#${id}-arc)`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * ARC_LENGTH} ${ARC_LENGTH}`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />

        {/* Ringed in the card's own surface so it reads as sitting on the
            arc rather than threaded onto it. */}
        <circle
          cx={knob.x} cy={knob.y} r="6.5"
          fill="var(--color-text)"
          stroke="var(--color-surface)"
          strokeWidth="2"
          className="transition-[cx,cy] duration-500 ease-out"
        />
      </svg>

      {/* Parked in the bowl of the arc rather than after it: the gauge is the
          frame and the figure is what it frames. */}
      {children && (
        <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
