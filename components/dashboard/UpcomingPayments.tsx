"use client";

import { formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import { useAccounts } from "@/lib/use-accounts";
import { DueBadge, shortDay } from "@/components/wallet/DueBadge";
import { payPrefill, usePaySheet } from "@/components/wallet/PayCard";
import type { AccountBalance } from "@/types";

/** A statement due within this many days (or already late) earns a spot on Inicio. */
const WINDOW_DAYS = 7;

/**
 * The cards whose statement is coming due and isn't paid yet, each with its
 * payment one tap away. Renders nothing the rest of the month.
 */
export function UpcomingPayments({ balances }: { balances: AccountBalance[] }) {
  const t = useT();
  const locale = useLocale();
  const { data: accounts } = useAccounts();
  const { pay, sheet } = usePaySheet();

  const due = (accounts ?? [])
    .filter(
      (a) =>
        a.isCredit &&
        a.cycle !== null &&
        a.cycle.remainingToPay > 0 &&
        a.cycle.daysUntilDue !== null &&
        a.cycle.daysUntilDue <= WINDOW_DAYS
    )
    .sort((a, b) => (a.cycle!.daysUntilDue ?? 0) - (b.cycle!.daysUntilDue ?? 0));

  if (due.length === 0) return sheet;

  return (
    <section>
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
        {t.wallet.upcomingPayments}
      </p>
      <div className="panel px-4">
        {due.map((a) => {
          const cycle = a.cycle!;
          return (
            // The badge sits under the figures rather than beside them: name,
            // badge and button side by side left the name two letters wide
            // on a phone.
            <div key={a.id} className="flex items-center gap-3 py-3 border-t border-divider first:border-t-0">
              <span className="w-[7px] h-[7px] rounded-full shrink-0 self-start mt-[7px]" style={{ backgroundColor: a.color ?? undefined }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-text truncate">{a.account}</p>
                <p className="text-[11.5px] text-text-dim mt-0.5 truncate">
                  <span className="tabular-nums font-semibold text-text-muted">{formatMXN(cycle.remainingToPay)}</span>
                  {cycle.dueDate && <span> · {t.wallet.due.on(shortDay(cycle.dueDate, locale))}</span>}
                </p>
                <DueBadge cycle={cycle} className="mt-1.5" />
              </div>
              <button
                type="button"
                onClick={() => pay(payPrefill(a.account, cycle, balances))}
                className="press shrink-0 font-mono text-[10.5px] font-medium text-accent uppercase tracking-wide px-1 min-h-[44px]"
              >
                {t.wallet.payCard}
              </button>
            </div>
          );
        })}
      </div>
      {sheet}
    </section>
  );
}
