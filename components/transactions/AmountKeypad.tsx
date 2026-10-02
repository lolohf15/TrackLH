"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Delete } from "lucide-react";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import { OPERATORS, pressKey } from "@/lib/amount-input";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const;


/**
 * The amount keypad, standing in for the iOS keyboard: that one has no
 * operators, covers half the sheet, and shoves a home-screen web app's
 * viewport around when it opens. This one is part of the sheet, so nothing
 * moves. While the amount is empty the top row offers round figures; once
 * something is typed it turns into the operators.
 */
export function AmountKeypad({
  value,
  onChange,
  onEquals,
  quickAmounts,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Collapses the expression into its result. */
  onEquals: () => void;
  quickAmounts: number[];
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showOperators = value !== "";

  // Holding backspace clears the whole amount, like iOS's calculator.
  function startBackspace() {
    clearTimer.current = setTimeout(() => {
      clearTimer.current = null;
      onChange("");
    }, 500);
  }
  function endBackspace(apply: boolean) {
    if (!clearTimer.current) return;
    clearTimeout(clearTimer.current);
    clearTimer.current = null;
    if (apply) onChange(value.slice(0, -1));
  }

  const rowTransition = reduceMotion
    ? { duration: 0.1 }
    : { duration: 0.15, ease: [0.23, 1, 0.32, 1] as const };

  return (
    <div role="group" aria-label={t.txSheet.keypad} className="select-none">
      <div className="relative h-11 mb-1.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {showOperators ? (
            <motion.div
              key="ops"
              className="absolute inset-0 grid grid-cols-5 gap-2"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={rowTransition}
            >
              {OPERATORS.map((op) => (
                <button
                  key={op.glyph}
                  type="button"
                  onClick={() => onChange(pressKey(value, op.insert))}
                  aria-label={op.glyph}
                  className="press rounded-full bg-surface-2 border border-border text-[20px] text-text"
                >
                  {op.glyph}
                </button>
              ))}
              <button
                type="button"
                onClick={onEquals}
                aria-label={t.txSheet.equals}
                className="press rounded-full bg-surface-2 border border-border text-[20px] text-accent"
              >
                =
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="quick"
              className="absolute inset-0 grid grid-cols-4 gap-2"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={rowTransition}
            >
              {quickAmounts.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(String(n))}
                  className="press rounded-full bg-surface-2 border border-border text-[14px] font-medium text-text tabular-nums"
                >
                  {formatMXN(n)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3">
        {DIGITS.map((d) => (
          <Key key={d} label={d === "." ? t.txSheet.decimalPoint : d} onPress={() => onChange(pressKey(value, d))}>
            {d === "." ? <span className="text-[28px] leading-none -mt-2">·</span> : d}
          </Key>
        ))}
        <Key
          label={t.txSheet.backspace}
          onPointerDown={startBackspace}
          onPointerUp={() => endBackspace(true)}
          onPointerLeave={() => endBackspace(false)}
          onKeyboardPress={() => onChange(value.slice(0, -1))}
        >
          <Delete size={24} strokeWidth={1.8} />
        </Key>
      </div>
    </div>
  );
}

/**
 * A digit: no fill at rest, a soft disc under the finger. The keys are hit
 * dozens of times a day, so the feedback is immediate and there's no motion
 * beyond the press itself.
 */
function Key({
  children,
  label,
  onPress,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onKeyboardPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  /** For keys driven by pointer events, what Enter/Space should do. */
  onKeyboardPress?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        // A pointer-driven key already acted on pointerup; a click with no
        // pointer behind it (detail 0) came from the keyboard.
        if (onPress) onPress();
        else if (e.detail === 0) onKeyboardPress?.();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      className="group h-12 grid place-items-center text-[26px] font-medium text-text tabular-nums touch-manipulation"
    >
      <span className="w-14 h-11 rounded-full grid place-items-center transition-colors duration-100 group-active:bg-surface-2">
        {children}
      </span>
    </button>
  );
}
