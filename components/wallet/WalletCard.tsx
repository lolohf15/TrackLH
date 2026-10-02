"use client";

import { formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import { shortDay } from "./DueBadge";
import type { AccountBalance, CreditCycleStatus } from "@/types";

/** A real card is 85.6 × 54 mm. */
export const CARD_RATIO = 85.6 / 54;
/** How much of a card shows when another sits on top of it: the name and
 *  the kind · amount line under it. */
export const CARD_PEEK = 64;

/** What the face leads with: the balance, what's left on a line, or the debt. */
export function cardFigure(a: AccountBalance): { kind: "balance" | "available" | "debt"; value: number } {
  if (!a.isCredit) return { kind: "balance", value: a.currentBalance };
  if (a.availableCredit !== null) return { kind: "available", value: a.availableCredit };
  return { kind: "debt", value: a.debt ?? 0 };
}

/**
 * The account as a physical card, painted in its own colour — the same one
 * its dot, its rows and its chart slices already wear. The top strip carries
 * everything needed to tell cards apart while they sit stacked, so the face
 * below it is free to look like a card.
 */
export function WalletCard({
  account, cycle,
}: { account: AccountBalance; cycle: CreditCycleStatus | null }) {
  const t = useT();
  const locale = useLocale();
  const c = account.color;
  const figure = cardFigure(account);
  const label =
    figure.kind === "balance" ? t.wallet.balance
    : figure.kind === "available" ? t.wallet.available
    : t.wallet.debt;
  const pct = account.utilizationPercent;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[18px] text-white select-none"
      style={{
        // Darkened toward the bottom so white type holds up on every hue,
        // amber and lavender included.
        background: `linear-gradient(150deg,
          color-mix(in oklab, ${c} 90%, black) 0%,
          color-mix(in oklab, ${c} 74%, black) 48%,
          color-mix(in oklab, ${c} 52%, black) 100%)`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.25), 0 10px 28px -12px rgba(0,0,0,0.55)",
        textShadow: "0 1px 2px rgba(0,0,0,0.22)",
      }}
    >
      {/* Light catching the plastic. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.22), transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(255,255,255,0.07), transparent 60%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3 px-5 pt-3.5" style={{ height: CARD_PEEK }}>
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold tracking-[-0.01em] truncate">{account.account}</p>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/70 mt-0.5 truncate">
            {account.isCredit ? t.wallet.credit : t.wallet.debit}
            <span className="mx-1.5 text-white/40">·</span>
            <span className="tabular-nums">{formatMXN(figure.value)}</span>
          </p>
        </div>
        <ContactlessIcon className="w-5 h-5 shrink-0 text-white/75 mt-0.5" />
      </div>

      <Chip className="absolute left-5 top-[38%] -translate-y-1/2 w-9 h-[27px]" />

      <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/65">{label}</p>
          <p className="text-[25px] font-semibold tabular-nums tracking-[-0.02em] leading-tight truncate">
            {formatMXN(figure.value)}
          </p>
          {pct !== null && (
            <div className="mt-1.5 h-[3px] w-28 rounded-full bg-white/20 overflow-hidden" aria-hidden>
              <div className="h-full rounded-full bg-white/85" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          )}
        </div>
        {cycle && (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/70 shrink-0 pb-0.5">
            {t.wallet.nextStatement(shortDay(cycle.nextStatementDate, locale))}
          </p>
        )}
      </div>
    </div>
  );
}

function Chip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 27" className={className} aria-hidden>
      <defs>
        <linearGradient id="chip-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dfa6" />
          <stop offset="0.5" stopColor="#c9a95c" />
          <stop offset="1" stopColor="#e9d08c" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="35" height="26" rx="5" fill="url(#chip-metal)" opacity="0.9" />
      <path
        d="M0.5 9.5h10M0.5 17.5h10M25.5 9.5h10M25.5 17.5h10M10.5 0.5v26M25.5 0.5v26M10.5 13.5h15"
        stroke="rgba(90,66,20,0.45)"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M7.5 8.5a5 5 0 0 1 0 7" />
      <path d="M11 6a9 9 0 0 1 0 12" />
      <path d="M14.5 3.5a13 13 0 0 1 0 17" />
    </svg>
  );
}
