"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { mutate } from "swr";
import { InitialBalances } from "@/components/dashboard/InitialBalances";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useT } from "@/lib/i18n-react";
import { ChevronDownIcon, PlusIcon } from "@/components/shell/icons";
import { AccountEditSheet, type EditableAccount } from "@/components/settings/AccountEditSheet";
import { formatMXN, getCurrentMonth, cn } from "@/lib/utils";
import type { DashboardData, AccountBalance } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Wallet() {
  const t = useT();
  const { data: dashboard, isLoading } =
    useSWR<DashboardData>(`/api/dashboard?month=${getCurrentMonth()}`, fetcher);
  // The dashboard reports balances by name; the config carries the id an edit
  // needs, so both are read here.
  const { data: configs } = useSWR<EditableAccount[]>("/api/accounts", fetcher);
  const [balancesOpen, setBalancesOpen] = useState(false);

  // null = closed, "new" = create, otherwise the account being edited.
  const [editing, setEditing] = useState<EditableAccount | "new" | null>(null);

  const configById = new Map((configs ?? []).map((c) => [c.account, c]));

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
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[15px] font-semibold text-text">{t.wallet.title}</h1>
        {/* Movements live on their own route until F6 folds them in here. */}
        <Link
          href="/movimientos"
          className="font-mono text-[10px] font-medium text-accent hover:brightness-125 tracking-wide"
        >
          {t.wallet.seeMovements} →
        </Link>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start">
        <div className="space-y-3">
          <section>
            <GroupLabel>{t.wallet.debit}</GroupLabel>
            <div className="panel px-4">
              {debit.map((a) => (
                <AccountRow
                  key={a.account}
                  account={a}
                  onEdit={configById.get(a.account) ? () => setEditing(configById.get(a.account)!) : undefined}
                />
              ))}
              <AddRow label={t.wallet.addAccount} onClick={() => setEditing("new")} />
            </div>
          </section>

          {credit.length > 0 && (
            <section>
              <GroupLabel>{t.wallet.credit}</GroupLabel>
              <div className="panel px-4">
                {credit.map((a) => (
                  <AccountRow
                    key={a.account}
                    account={a}
                    credit
                    onEdit={configById.get(a.account) ? () => setEditing(configById.get(a.account)!) : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="panel px-4 py-3.5 flex items-baseline justify-between">
            <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">{t.wallet.totalAvailable}</span>
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
              {t.wallet.adjustBalances}
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

          <AccountEditSheet
            key={editing === "new" ? "new" : editing?.id ?? "none"}
            account={editing === "new" ? null : editing}
            open={editing !== null}
            onClose={() => setEditing(null)}
          />
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

function AccountRow({
  account, credit, onEdit,
}: { account: AccountBalance; credit?: boolean; onEdit?: () => void }) {
  const t = useT();
  // Without a line on file there's nothing to be available against, so the
  // card falls back to reading as a plain debt — the way it always has.
  const hasLine = credit && account.availableCredit !== null;
  const overLine = hasLine && (account.availableCredit as number) < 0;

  const body = (
    <div className="w-full flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: account.color }} />
          <span className="text-[13.5px] text-text truncate">{account.account}</span>
        </div>
        <span className="shrink-0 ml-2.5 whitespace-nowrap">
          <span className={cn(
            "font-mono text-sm font-semibold",
            overLine ? "text-red-fg" : credit && !hasLine ? "text-red-fg" : "text-text"
          )}>
            {formatMXN(hasLine ? (account.availableCredit as number) : account.currentBalance)}
          </span>
          {hasLine && <span className="text-[10.5px] text-text-dim ml-1.5">{t.wallet.available}</span>}
        </span>
      </div>

      {hasLine && <CreditLine account={account} />}
    </div>
  );

  // An account that exists only inside old movements has no config row to
  // edit, so it stays a plain row rather than a dead button.
  if (!onEdit) {
    return (
      <div className="flex items-center justify-between py-3 border-t border-divider first:border-t-0">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="press w-full flex items-center justify-between py-3 border-t border-divider first:border-t-0 text-left"
    >
      {body}
    </button>
  );
}

/** How much of the approved line is spoken for, as a bar plus its two numbers. */
function CreditLine({ account }: { account: AccountBalance }) {
  const t = useT();
  const pct = account.utilizationPercent ?? 0;
  // The same bands a credit score reads: comfortable, watch it, too much.
  const tone =
    pct >= 70 ? "var(--color-red)" : pct >= 30 ? "var(--color-amber)" : "var(--color-green)";

  return (
    <div className="flex flex-col gap-1.5">
      <ProgressBar segments={[{ percent: pct, color: tone }]} height={4} />
      <div className="flex items-baseline justify-between gap-2 font-mono text-[10.5px] text-text-dim">
        <span className="truncate">
          {formatMXN(account.debt ?? 0)} {t.common.of} {formatMXN(account.creditLimit ?? 0)}
        </span>
        <span className="shrink-0" style={{ color: tone }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press w-full flex items-center gap-2.5 py-3 border-t border-divider text-left text-accent"
    >
      <PlusIcon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[13.5px]">{label}</span>
    </button>
  );
}
