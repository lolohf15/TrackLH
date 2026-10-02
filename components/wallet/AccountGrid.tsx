"use client";

import { TickMeter } from "@/components/ui/TickMeter";
import { useT } from "@/lib/i18n-react";
import { formatMXN, cn } from "@/lib/utils";
import { PlusIcon } from "@/components/shell/icons";
import type { AccountBalance } from "@/types";

/**
 * The Wallet's plain view, the way it read before the card stack: debit
 * accounts as a grid of tinted tiles, cards full width with their line.
 * Kept for anyone who'd rather scan than flip through a deck.
 */
export function AccountGrid({
  debit, credit, selected, onSelect, onAdd,
}: {
  debit: AccountBalance[];
  credit: AccountBalance[];
  selected: string;
  onSelect: (account: string) => void;
  onAdd: () => void;
}) {
  const t = useT();
  return (
    <>
      <GroupLabel>{t.wallet.debit}</GroupLabel>
      <div className="grid grid-cols-2 gap-2.5">
        {debit.map((a) => (
          <AccountCard
            key={a.account}
            account={a}
            selected={selected === a.account}
            onSelect={() => onSelect(a.account)}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="press rounded-lg border border-dashed border-border-strong flex items-center justify-center gap-2 py-4 text-accent min-h-[74px]"
        >
          <PlusIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[12.5px]">{t.wallet.addAccount}</span>
        </button>
      </div>

      {credit.length > 0 && (
        <>
          <GroupLabel>{t.wallet.credit}</GroupLabel>
          <div className="flex flex-col gap-2.5">
            {credit.map((a) => (
              <CreditCard
                key={a.account}
                account={a}
                selected={selected === a.account}
                onSelect={() => onSelect(a.account)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Grouped-list caption: names the group below it and sits outside it. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pt-4 pb-2">
      {children}
    </p>
  );
}

/**
 * Each account glows in its own colour — the one already on its dot, its
 * rows in every list, and its slice of every chart. Tapping one points the
 * movements beside it at that account.
 */
function AccountCard({
  account, selected, onSelect,
}: { account: AccountBalance; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "tint press px-3 py-2.5 text-left min-w-0 transition-shadow duration-150 ease-out",
        selected && "ring-1 ring-accent"
      )}
      style={{ ["--tint-hue" as string]: account.color }}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ backgroundColor: account.color }}
        />
        <span className="text-[12px] text-text-muted truncate">{account.account}</span>
      </span>
      <span className="block text-[17px] font-semibold text-text tabular-nums mt-1">
        {formatMXN(account.currentBalance)}
      </span>
    </button>
  );
}

/** A line of credit says more than a balance does, so it gets the full width:
 *  what's left, then how much of the limit is already spoken for. */
function CreditCard({
  account, selected, onSelect,
}: { account: AccountBalance; selected: boolean; onSelect: () => void }) {
  const t = useT();
  // Without a line on file there's nothing to be available against, so the
  // card falls back to reading as a plain debt — the way it always has.
  const hasLine = account.availableCredit !== null;
  const overLine = hasLine && (account.availableCredit as number) < 0;
  const pct = account.utilizationPercent ?? 0;
  // The same bands a credit score reads: comfortable, watch it, too much.
  const tone =
    pct >= 70 ? "var(--color-red)" : pct >= 30 ? "var(--color-amber)" : "var(--color-green)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "tint press w-full px-4 py-3 text-left transition-shadow duration-150 ease-out",
        selected && "ring-1 ring-accent"
      )}
      style={{ ["--tint-hue" as string]: account.color }}
    >
      <div className="flex items-center justify-between gap-2.5 min-w-0">
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{ backgroundColor: account.color }}
          />
          <span className="text-[13.5px] text-text truncate">{account.account}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap">
          <span
            className={cn(
              "text-[17px] font-semibold tabular-nums",
              overLine || !hasLine ? "text-red-fg" : "text-text"
            )}
          >
            {formatMXN(hasLine ? (account.availableCredit as number) : account.currentBalance)}
          </span>
          {hasLine && <span className="text-[10.5px] text-text-dim ml-1.5">{t.wallet.available}</span>}
        </span>
      </div>

      {hasLine && (
        <div className="flex flex-col gap-1.5 mt-2.5">
          <TickMeter percent={pct} color={tone} ticks={38} height={15} />
          <div className="flex items-baseline justify-between gap-2 font-mono text-[10.5px] text-text-dim">
            <span className="truncate">
              {formatMXN(account.debt ?? 0)} {t.common.of} {formatMXN(account.creditLimit ?? 0)}
            </span>
            <span className="shrink-0" style={{ color: tone }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
