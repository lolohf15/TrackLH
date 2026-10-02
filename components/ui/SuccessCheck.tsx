"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";

export type SuccessCheckState = "pending" | "done";

const SIZE = 88;
const R = 38;

/**
 * The Apple Pay-style confirmation. While `pending`, a quarter arc
 * spins — the request is actually in flight, so the spin is honest. On
 * `done` the ring closes into a full circle and the check draws itself in.
 * The circle is only ever completed by a server answer, never by a timer.
 */
export function SuccessCheck({
  state,
  color = "var(--color-green)",
}: {
  state: SuccessCheckState;
  color?: string;
}) {
  const reduceMotion = useReducedMotion();
  const done = state === "done";
  const rotate = useMotionValue(0);

  // Spin while pending. Stopping (rather than animating back to 0) leaves the
  // arc at whatever angle the answer caught it, and it closes from there —
  // snapping back first is the tell of a fake spinner.
  useEffect(() => {
    if (reduceMotion || done) return;
    const spin = animate(rotate, rotate.get() + 360, {
      duration: 0.8,
      ease: "linear",
      repeat: Infinity,
    });
    return () => spin.stop();
  }, [done, reduceMotion, rotate]);

  return (
    <motion.svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : done
            ? { opacity: 1, scale: [1, 1.06, 1] }
            : { opacity: 1, scale: 1 }
      }
      transition={
        done && !reduceMotion
          ? { scale: { duration: 0.32, delay: 0.3, ease: [0.23, 1, 0.32, 1] } }
          : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
      }
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke={`color-mix(in srgb, ${color} 18%, transparent)`}
        strokeWidth={5}
      />

      {/* The spinner rotates as a group so the arc's own pathLength can be
          animated independently when it closes. */}
      <motion.g style={{ rotate, originX: "50%", originY: "50%" }}>
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          initial={{ pathLength: reduceMotion ? 1 : 0.25 }}
          animate={{ pathLength: done || reduceMotion ? 1 : 0.25, opacity: reduceMotion && !done ? 0.4 : 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.23, 1, 0.32, 1] }}
        />
      </motion.g>

      <motion.path
        d="M28 45 L39 56 L61 33"
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : {
                pathLength: { duration: 0.28, delay: 0.26, ease: [0.23, 1, 0.32, 1] },
                opacity: { duration: 0.01, delay: 0.26 },
              }
        }
      />
    </motion.svg>
  );
}
