"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

const COUNT_UP_DURATION = 0.6;
// Matches --ease-out in globals.css — Motion takes a bezier array, CSS a string.
const COUNT_UP_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

/**
 * Tweens a displayed number from its previous value to `value` whenever it
 * changes, formatting through `format` on every frame. First render shows
 * the value as-is (nothing to tween from yet — animating in from 0 on load
 * would be a fake transition, not a real one). Jumps instantly under
 * reduced motion.
 */
export function useCountUp(value: number, format: (n: number) => string): string {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;

    if (reduceMotion || from === value) {
      setDisplay(value);
      return;
    }

    const controls = animate(from, value, {
      duration: COUNT_UP_DURATION,
      ease: COUNT_UP_EASE,
      onUpdate: setDisplay,
    });

    return () => controls.stop();
  }, [value, reduceMotion]);

  return format(display);
}
