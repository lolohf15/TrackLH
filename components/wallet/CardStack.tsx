"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import { CARD_PEEK, CARD_RATIO, WalletCard, cardFigure } from "./WalletCard";
import type { AccountBalance, CreditCycleStatus } from "@/types";

export interface StackCard {
  account: AccountBalance;
  cycle: CreditCycleStatus | null;
}

/** Below the card in front, the rest fold into a pile of edges. */
const SLIVER = 11;
const GAP = 12;
/** Room around the deck so the cards' shadows aren't cut off by the clip. */
const BLEED = 16;

const SPRING = { type: "spring", duration: 0.5, bounce: 0.14 } as const;

/**
 * The accounts as a wallet. With nothing picked they sit one behind another,
 * each showing its name and figure, the last one whole. Picking one brings it
 * to the front of the deck and folds the rest into a pile under it; picking
 * it again deals the deck back out. Springs, so a tap mid-flight turns the
 * motion around from where it is instead of starting over.
 */
export function CardStack({
  cards, selected, onSelect,
}: {
  cards: StackCard[];
  /** The account in front, or "" for the whole deck. */
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

  const cardH = width / CARD_RATIO;
  const focus = cards.findIndex((c) => c.account.account === selected);
  const pile = cards.filter((_, i) => i !== focus);

  // Where each card sits, and how tall the deck is around them.
  const place = (i: number): { y: number; scale: number; z: number } => {
    if (focus === -1) return { y: i * CARD_PEEK, scale: 1, z: i };
    if (i === focus) return { y: 0, scale: 1, z: cards.length + 1 };
    const j = i < focus ? i : i - 1;
    // The pile narrows a touch toward the back, like cards seen edge-on.
    return { y: cardH + GAP + j * SLIVER, scale: 1 - (pile.length - 1 - j) * 0.012, z: j };
  };
  const height =
    focus === -1
      ? Math.max(0, cards.length - 1) * CARD_PEEK + cardH
      : cardH + (pile.length > 0 ? GAP + (pile.length - 1) * SLIVER + CARD_PEEK : 0);

  const transition = reduceMotion ? { duration: 0 } : SPRING;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        // In front-and-pile mode the pile is cut off at its last header, so
        // no bleed below it: the shadow room would show the card under it.
        <div
          className="overflow-hidden"
          style={{
            margin: -BLEED,
            padding: BLEED,
            marginBottom: focus === -1 ? -BLEED : 0,
            paddingBottom: focus === -1 ? BLEED : 0,
          }}
        >
          <motion.div
            className="relative"
            initial={false}
            animate={{ height }}
            transition={transition}
          >
            {cards.map((card, i) => {
              const p = place(i);
              const isFocus = i === focus;
              const figure = cardFigure(card.account);
              return (
                <motion.button
                  key={card.account.account}
                  type="button"
                  onClick={() => onSelect(card.account.account)}
                  aria-pressed={isFocus}
                  aria-label={`${card.account.account}, ${formatMXN(figure.value)}${isFocus ? `. ${t.wallet.backToDeck}` : ""}`}
                  className="absolute inset-x-0 top-0 block text-left origin-top outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[18px] [-webkit-tap-highlight-color:transparent]"
                  style={{ height: cardH, zIndex: p.z }}
                  initial={false}
                  animate={{ y: p.y, scale: p.scale }}
                  transition={transition}
                  whileTap={reduceMotion ? undefined : { scale: p.scale * 0.985 }}
                >
                  <WalletCard account={card.account} cycle={card.cycle} />
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}
