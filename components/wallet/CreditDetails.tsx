"use client";

import { Button } from "@/components/ui/Button";
import { TickMeter } from "@/components/ui/TickMeter";
import { formatMXN, cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import { DueBadge, shortDay } from "./DueBadge";
import type { AccountBalance, CreditCycleStatus } from "@/types";

/**
 * What a card's face has no room for: where the last statement stands and
 * how much of the line is spoken for, with the payment one tap away.
 */
export function CreditDetails({
  account, cycle, onPay, onEdit,
}: {
  account: AccountBalance;
  cycle: CreditCycleStatus | null;
  onPay: () => void;
  onEdit?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const pct = account.utilizationPercent;
  // The same bands a credit score reads: comfortable, watch it, too much.
  const tone =
    pct === null ? "" : pct >= 70 ? "var(--color-red)" : pct >= 30 ? "var(--color-amber)" : "var(--color-green)";

  return (
    <section className="panel px-4 py-3.5 mt-3 space-y-3.5">
      {cycle ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                {t.wallet.statementBalance}
              </p>
              <p className="text-[24px] font-semibold text-text tabular-nums tracking-[-0.02em] leading-tight mt-1">
                {formatMXN(cycle.statementBalance)}
              </p>
              <p className="text-[11.5px] text-text-dim mt-0.5">
                {t.wallet.statementBalanceHint}
                {cycle.dueDate && <> · {t.wallet.due.on(shortDay(cycle.dueDate, locale))}</>}
              </p>
            </div>
            <DueBadge cycle={cycle} className="mt-0.5" />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-divider pt-3">
            <Figure label={t.wallet.paidSinceStatement} value={formatMXN(cycle.paidSinceStatement)} />
            <Figure
              label={t.wallet.remainingToPay}
              value={formatMXN(cycle.remainingToPay)}
              strong={cycle.remainingToPay > 0}
            />
            <Figure label={t.wallet.currentCycleSpend} value={formatMXN(cycle.currentCycleSpend)} />
            <Figure
              label={t.wallet.nextStatementLabel}
              value={shortDay(cycle.nextStatementDate, locale)}
            />
          </dl>
        </>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="press w-full text-left text-[12.5px] text-text-muted leading-relaxed"
        >
          {t.wallet.addCycleDates} <span className="text-accent">→</span>
        </button>
      )}

      {pct !== null && (
        <div className={cn("flex flex-col gap-1.5", cycle && "border-t border-divider pt-3")}>
          <TickMeter percent={pct} color={tone} ticks={38} height={15} />
          <div className="flex items-baseline justify-between gap-2 font-mono text-[10.5px] text-text-dim">
            <span className="truncate">
              {formatMXN(account.debt ?? 0)} {t.common.of} {formatMXN(account.creditLimit ?? 0)}
            </span>
            <span className="shrink-0" style={{ color: tone }}>{Math.round(pct)}%</span>
          </div>
        </div>
      )}

      <Button onClick={onPay} size="lg" className="w-full py-3">
        {t.wallet.payCard}
      </Button>
    </section>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9.5px] font-semibold text-text-dim uppercase tracking-[0.1em] truncate">{label}</dt>
      <dd className={cn("text-[15px] tabular-nums mt-0.5", strong ? "font-semibold text-text" : "text-text-muted")}>
        {value}
      </dd>
    </div>
  );
}
