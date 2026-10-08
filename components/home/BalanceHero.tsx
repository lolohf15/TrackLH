"use client";

import Link from "next/link";
import { ArrowLeftRight, ChartPie, Plus, type LucideIcon } from "lucide-react";
import { useAddRecord } from "@/components/transactions/AddRecordProvider";
import { useCountUp } from "@/lib/useCountUp";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";

/**
 * The top of Inicio: what there is, large and centred, and the three things
 * most often done from here as round buttons under it.
 */
export function BalanceHero({
  total,
  netWorth,
  accounts,
}: {
  total: number;
  /** Shown only when card debt pulls it away from the total. */
  netWorth: number | null;
  accounts: number;
}) {
  const t = useT();
  const openAddRecord = useAddRecord();
  const display = useCountUp(total, formatMXN);

  return (
    <section className="flex flex-col items-center text-center pt-8 pb-2 md:pt-6">
      <p className="text-[12.5px] text-text-dim">{t.overview.totalBalance}</p>
      <p className="mt-1 text-[44px] leading-none font-semibold text-text tabular-nums tracking-[-0.035em]">
        {display}
      </p>
      <p className="mt-2 text-[12.5px] text-text-dim tabular-nums">
        {netWorth !== null ? t.overview.netWorth(formatMXN(netWorth)) : t.overview.accounts(accounts)}
      </p>

      <div className="mt-5 flex items-start justify-center gap-7">
        <Action icon={Plus} label={t.overview.actionLog} onClick={() => openAddRecord({ type: "Gasto" })} />
        <Action icon={ArrowLeftRight} label={t.overview.actionMove} onClick={() => openAddRecord({ type: "Transferencia" })} />
        <Action icon={ChartPie} label={t.overview.actionAnalytics} href="/analytics" />
      </div>
    </section>
  );
}

function Action({
  icon: Icon, label, onClick, href,
}: { icon: LucideIcon; label: string; onClick?: () => void; href?: string }) {
  const body = (
    <>
      <span className="w-12 h-12 rounded-full grid place-items-center bg-surface-2 border border-border text-text transition-colors duration-150 group-hover:bg-surface-3">
        <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-[11.5px] text-text-muted">{label}</span>
    </>
  );
  const cls = "press group flex flex-col items-center gap-1.5 min-w-[64px] outline-none focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-accent";
  return href ? (
    <Link href={href} className={cls}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  );
}
