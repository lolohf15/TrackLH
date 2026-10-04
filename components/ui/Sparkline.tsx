"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * A small line with no axis, for a trend that sits beside its own figure —
 * a card's line in use over the months. A dashed reference marks the value
 * that matters (the limit, at 100%); the last point gets a dot, since "where
 * it is now" is what a sparkline is read for.
 */
export function Sparkline({
  values,
  color,
  height = 40,
  reference,
  floorMax,
  label,
  className,
}: {
  values: number[];
  color: string;
  height?: number;
  /** A dashed line across, in the same units. */
  reference?: number;
  /** The top of the scale is at least this, so a card at 12% doesn't fill
   *  the height and read like one at 100%. */
  floorMax?: number;
  /** What a screen reader hears instead: the values, in words. */
  label: string;
  className?: string;
}) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const n = values.length;
  const max = Math.max(1, floorMax ?? 0, reference ?? 0, ...values) * 1.08;
  // Kept off the very top and bottom edges so a 2px stroke isn't half clipped.
  const pad = 6;
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => pad + (1 - v / max) * (100 - 2 * pad);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const last = values[n - 1] ?? 0;

  return (
    <div className={className} role="img" aria-label={label}>
      <div className="relative" style={{ height }}>
        <motion.svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
          // Uncovered left to right rather than drawn by pathLength, which a
          // non-scaling stroke in a stretched box stops partway through.
          initial={reduceMotion ? false : { clipPath: "inset(-10% 100% -10% 0)" }}
          animate={{ clipPath: "inset(-10% 0% -10% 0)" }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {reference !== undefined && (
            <line
              x1="0" x2="100" y1={y(reference)} y2={y(reference)}
              stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {n > 1 && <path d={`${path} L ${x(n - 1)} 100 L ${x(0)} 100 Z`} fill={`url(#${id}-fill)`} />}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </motion.svg>
        {n > 0 && (
          <span
            aria-hidden="true"
            className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x(n - 1)}%`,
              top: `${y(last)}%`,
              background: color,
              boxShadow: "0 0 0 2px var(--color-surface)",
            }}
          />
        )}
      </div>
    </div>
  );
}
