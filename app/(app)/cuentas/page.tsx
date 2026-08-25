"use client";

import { useState } from "react";
import useSWR from "swr";
import { mutate } from "swr";
import { InitialBalances } from "@/components/dashboard/InitialBalances";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChevronDownIcon } from "@/components/shell/icons";
import { formatMXN, getCurrentMonth, cn } from "@/lib/utils";
import type { DashboardData, AccountBalance } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Cuentas() {
  const { data: dashboard, isLoading } =
    useSWR<DashboardData>(`/api/dashboard?month=${getCurrentMonth()}`, fetcher);
  const [balancesOpen, setBalancesOpen] = useState(false);

  const balances = dashboard?.accountBalances ?? [];
  const debit = balances.filter((a) => !a.isCredit);
  const credit = balances.filter((a) => a.isCredit);
  const totalAvailable = dashboard?.totalAvailable ?? 0;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
        <ChartSkeleton height="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
      <h1 className="text-[15px] font-semibold text-text mb-4">Cuentas</h1>

      <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start">
        <div className="space-y-3">
          <section>
            <GroupLabel>Débito</GroupLabel>
            <div className="panel px-4">
              {debit.map((a) => <AccountRow key={a.account} account={a} />)}
            </div>
          </section>

          {credit.length > 0 && (
            <section>
              <GroupLabel>Crédito</GroupLabel>
              <div className="panel px-4">
                {credit.map((a) => <AccountRow key={a.account} account={a} credit />)}
              </div>
            </section>
          )}

          <div className="panel px-4 py-3.5 flex items-baseline justify-between">
            <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Total disponible</span>
            <span className="font-mono text-base font-semibold text-text">{formatMXN(totalAvailable)}</span>
          </div>
        </div>

        <div className="mt-3 md:mt-0">
          <button
            type="button"
            onClick={() => setBalancesOpen((v) => !v)}
            aria-expanded={balancesOpen}
            className="press panel w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 mb-3"
          >
            <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
              Ajuste de saldos actuales
            </span>
            <ChevronDownIcon
              className={cn(
                "w-4 h-4 text-text-dim shrink-0 transition-transform duration-200 ease-out",
                balancesOpen && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "overflow-hidden transition-[max-height] duration-300 ease-out",
              balancesOpen ? "max-h-[3000px]" : "max-h-0"
            )}
          >
            <InitialBalances onSaved={() => mutate(() => true)} />
          </div>

          <div className="mt-3">
            <AccountPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Grouped-list caption: names the panel below it and sits outside it. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
      {children}
    </p>
  );
}

function AccountRow({ account, credit }: { account: AccountBalance; credit?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-divider first:border-t-0">
      <div className="flex items-center gap-2.5">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: account.color }} />
        <span className="text-[13.5px] text-text">{account.account}</span>
      </div>
      <span className={cn("font-mono text-sm font-semibold", credit ? "text-red-fg" : "text-text")}>
        {formatMXN(account.currentBalance)}
      </span>
    </div>
  );
}
