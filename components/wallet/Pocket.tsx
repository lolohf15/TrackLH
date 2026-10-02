"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { AccountBalance } from "@/types";

/** A peso note is about 2.2 times as wide as it is tall. */
const BILL_RATIO = 2.2;
/** How much of the front bill shows above the pocket, and of each one behind it. */
const BILL_PEEK = 46;
const BILL_STEP = 14;
const BILL_INSET = 12;

const SPRING = { type: "spring", duration: 0.5, bounce: 0.14 } as const;

/**
 * The wallet's pocket, under the cards. Cash sits in it as bills with their
 * top edge showing; tapping one pulls it out whole, the same spring the cards
 * use.
 */
export function Pocket({
  bills, selected, onSelect,
}: {
  bills: AccountBalance[];
  selected: string;
  onSelect: (account: string) => void;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const billW = Math.max(0, width - BILL_INSET * 2);
  const billH = billW / BILL_RATIO;
  const out = bills.findIndex((b) => b.account === selected);
  const zone =
    bills.length === 0 ? 0
    : out === -1 ? BILL_PEEK + (bills.length - 1) * BILL_STEP
    : billH + 14;

  const place = (i: number): { y: number; z: number } => {
    if (out === -1) return { y: i * BILL_STEP, z: i };
    if (i === out) return { y: 0, z: bills.length + 1 };
    // The rest drop back into the pocket, just their edges showing.
    const j = i < out ? i : i - 1;
    return { y: zone - 18 + j * 5, z: j };
  };
  const transition = reduceMotion ? { duration: 0 } : SPRING;

  return (
    <div ref={ref} className="relative mt-4">
      {width > 0 && bills.length > 0 && (
        // Clipped at the pocket's mouth: whatever is below it is inside.
        <motion.div className="relative overflow-hidden" initial={false} animate={{ height: zone }} transition={transition}>
          {bills.map((b, i) => {
            const p = place(i);
            const isOut = i === out;
            return (
              <motion.button
                key={b.account}
                type="button"
                onClick={() => onSelect(b.account)}
                aria-pressed={isOut}
                aria-label={`${b.account}, ${formatMXN(b.currentBalance)}`}
                className="absolute top-0 block text-left outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[6px] [-webkit-tap-highlight-color:transparent]"
                style={{ left: BILL_INSET, width: billW, height: billH, zIndex: p.z }}
                initial={false}
                animate={{ y: p.y }}
                transition={transition}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              >
                <Bill account={b} />
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* The pocket's face sits over the bills' lower half. */}
      <div
        className="relative z-20 rounded-t-[14px] rounded-b-[22px] border border-border bg-surface-2 px-3.5 pt-3 pb-3.5"
        style={{ boxShadow: "0 -6px 14px -10px rgba(0,0,0,0.5)" }}
      >
        <div aria-hidden className="absolute inset-x-2.5 top-1.5 border-t border-dashed border-border-strong" />
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] pt-1">
          {t.wallet.pocket}
        </p>
      </div>
    </div>
  );
}

/**
 * A banknote in the account's colour, muted toward the green-grey of paper
 * money: fine engraved lines, a dashed frame and a watermark in the middle.
 */
function Bill({ account }: { account: AccountBalance }) {
  const t = useT();
  const c = account.color;
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[6px] select-none"
      style={{
        background: `color-mix(in oklab, ${c} 40%, #6b8a60)`,
        color: "#f3f6ee",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 20px -10px rgba(0,0,0,0.55)",
        textShadow: "0 1px 1px rgba(0,0,0,0.2)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 5px), repeating-linear-gradient(65deg, #fff 0 1px, transparent 1px 7px)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-[6px] rounded-[3px] border border-dashed border-white/35" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
        style={{ width: "26%", aspectRatio: "1", background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)" }}
      />

      <div className="relative flex items-start justify-between gap-3 px-4 pt-3">
        <span className="text-[14.5px] font-semibold truncate">{account.account}</span>
        <span className="text-[16px] font-semibold tabular-nums shrink-0">{formatMXN(account.currentBalance)}</span>
      </div>
      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/70">{t.wallet.cash}</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/60">MXN</span>
      </div>
    </div>
  );
}
