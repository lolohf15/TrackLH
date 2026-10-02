"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptics";

/**
 * Press and hold to confirm. A fill sweeps across while the button is held
 * and the action fires when it reaches the end; letting go early snaps the
 * fill back. Slow on purpose while you decide, fast when you change your mind.
 * Replaces a two-step "Delete → Yes, delete" with one deliberate gesture.
 *
 * Works the same from a keyboard: hold Space or Enter.
 */
export function HoldButton({
  label,
  holdingLabel,
  onConfirm,
  holdMs = 1500,
  disabled,
  className,
}: {
  label: string;
  /** Shown while held, e.g. "Keep holding…". */
  holdingLabel: string;
  onConfirm: () => void;
  holdMs?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function start() {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      hapticTap();
      onConfirm();
    }, holdMs);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        // Keep the pointer even if the finger drifts off the button edge.
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancel();
      }}
      // A long press on iOS otherwise opens the text-selection callout.
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "press relative w-full overflow-hidden rounded-md border border-red-border bg-red-bg",
        "min-h-[48px] text-[13px] font-medium text-red-fg select-none touch-none",
        "disabled:opacity-40",
        className
      )}
      style={{ WebkitTouchCallout: "none" }}
    >
      {/* The fill: a red layer revealed left to right by clip-path, which
          stays on the compositor instead of animating width. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-red"
        style={{
          clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: holding
            ? `clip-path ${holdMs}ms linear`
            : "clip-path 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
      <span
        className={cn(
          "relative transition-colors duration-150",
          holding && "text-red-ink"
        )}
      >
        {holding ? holdingLabel : label}
      </span>
    </button>
  );
}
