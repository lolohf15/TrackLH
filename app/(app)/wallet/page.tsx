"use client";

import { Suspense, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { InitialBalances } from "@/components/dashboard/InitialBalances";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFiltersPanel } from "@/components/transactions/TransactionFilters";
import { MonthPickerSheet } from "@/components/dashboard/MonthPickerSheet";
import { StepButton } from "@/components/dashboard/PeriodNav";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { CardStack, type StackCard } from "@/components/wallet/CardStack";
import { CreditDetails } from "@/components/wallet/CreditDetails";
import { shortDay } from "@/components/wallet/DueBadge";
import { payPrefill, usePaySheet } from "@/components/wallet/PayCard";
import { useAccounts } from "@/lib/use-accounts";
import { cycleContaining, stepCycle } from "@/services/credit-cycle";
import { useLocale, useT } from "@/lib/i18n-react";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "@/components/shell/icons";
import { AccountEditSheet, type EditableAccount } from "@/components/settings/AccountEditSheet";
import { formatMXN, cn } from "@/lib/utils";
import {
  dayKey, formatPeriodLabel, isPeriodKind, monthKey, parseAnchor, resolvePeriod,
  stepAnchor, todayAnchor, wallClockNow, type PeriodKind,
} from "@/services/period";
import type {
  DashboardData,
  PaginatedTransactions,
  TransactionFilters,
  YearlyDashboardData,
} from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildTxUrl(f: TransactionFilters): string {
  const p = new URLSearchParams();
  p.set("period", f.period);
  if (f.period !== "all") p.set("anchor", f.anchor);
  if (f.period === "cycle" && f.cut) p.set("cut", String(f.cut));
  if (f.category) p.set("category", f.category);
  if (f.account) p.set("account", f.account);
  if (f.type) p.set("type", f.type);
  p.set("page", String(f.page));
  p.set("limit", String(f.limit));
  return `/api/transactions?${p}`;
}

export default function Wallet() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
          <ChartSkeleton height="h-96" />
        </div>
      }
    >
      <WalletEntry />
    </Suspense>
  );
}

/** Arriving with a different deep link is a different starting point, so the
 *  filters restart from it instead of an effect syncing them afterwards. */
function WalletEntry() {
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  const account = params.get("account") ?? "";
  const rawPeriod = params.get("period") ?? "";
  const period = isPeriodKind(rawPeriod) ? rawPeriod : null;
  const anchor = params.get("anchor");
  return (
    <WalletScreen
      key={`${category}|${account}|${period}|${anchor}`}
      category={category}
      account={account}
      period={period}
      anchor={anchor}
    />
  );
}

/** How many movements the list shows before it's asked for the rest. */
const PREVIEW = 10;

function thisMonth(): Pick<TransactionFilters, "period" | "anchor"> {
  return { period: "month", anchor: dayKey(todayAnchor()) };
}

function WalletScreen({
  category, account, period, anchor,
}: {
  category: string;
  account: string;
  /** From a link out of Analytics or Inicio; null when arriving plain. */
  period: PeriodKind | null;
  anchor: string | null;
}) {
  const t = useT();
  const locale = useLocale();

  const { data: dashboard, isLoading } =
    useSWR<DashboardData>("/api/dashboard?period=month", fetcher);
  // The dashboard reports balances by name; the config carries the id an edit
  // needs, so both are read here.
  const { data: configs } = useAccounts();
  const reduceMotion = useReducedMotion();
  const { pay, sheet: paySheet } = usePaySheet();

  // One source of truth for "which account am I looking at": the card and the
  // filter sheet write the same field, and the card lights up from it.
  const [filters, setFiltersState] = useState<TransactionFilters>(() => ({
    // A category or an account asked for on its own is a question about its
    // history, so it opens on all of it; a plain visit opens on this month.
    period: period ?? (category || account ? "all" : "month"),
    anchor: dayKey(anchor ? parseAnchor(anchor) : todayAnchor()),
    category, account, type: "", page: 1, limit: 50,
  }));
  // The list opens cut to a preview, and anything that changes what it lists
  // cuts it back — turning a page is the one change that keeps it open.
  const [expanded, setExpanded] = useState(false);
  function setFilters(update: (f: TransactionFilters) => TransactionFilters) {
    setFiltersState(update);
    setExpanded(false);
  }

  const [openedAt] = useState(() => wallClockNow().getTime());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => parseAnchor(filters.anchor).getUTCFullYear());
  const { data: yearly, isLoading: yearlyLoading } = useSWR<YearlyDashboardData>(
    pickerOpen ? `/api/dashboard/yearly?year=${pickerYear}` : null,
    fetcher
  );
  const listRef = useRef<HTMLElement>(null);

  const { data: transactions, isLoading: txLoading } =
    useSWR<PaginatedTransactions>(buildTxUrl(filters), fetcher);
  const { data: filterOptions } =
    useSWR<{ categories: string[]; accounts: string[] }>("/api/transactions/filters", fetcher);

  const [balancesOpen, setBalancesOpen] = useState(false);
  // null = closed, "new" = create, otherwise the account being edited.
  const [editing, setEditing] = useState<EditableAccount | "new" | null>(null);

  const configByAccount = new Map((configs ?? []).map((c) => [c.account, c]));
  const balances = dashboard?.accountBalances ?? [];
  const debit = balances.filter((a) => !a.isCredit);
  // Debit first, then the cards, in one deck.
  const cards: StackCard[] = [...debit, ...balances.filter((a) => a.isCredit)].map((a) => ({
    account: a,
    cycle: configByAccount.get(a.account)?.cycle ?? null,
  }));
  const selectedConfig = filters.account ? configByAccount.get(filters.account) : undefined;
  const selectedBalance = balances.find((a) => a.account === filters.account);

  /** The filters for looking at one account, or at all of them again. */
  function lookAt(f: TransactionFilters, name: string): TransactionFilters {
    if (!name) {
      return { ...f, ...thisMonth(), cut: undefined, account: "", page: 1 };
    }
    // A card with a cut day reads by its own cycle, which starts the day
    // after the cut wherever that falls in the month.
    const cut = configByAccount.get(name)?.statementDay ?? null;
    if (cut !== null) {
      return { ...f, account: name, period: "cycle", cut, anchor: dayKey(todayAnchor()), page: 1 };
    }
    // Any other account drops the month: its history is the point of asking,
    // and half of them see nothing in a given month.
    return { ...f, account: name, period: "all", cut: undefined, page: 1 };
  }

  function pick(name: string) {
    // Tapping the card already in front deals the deck back out, and the
    // list goes back to this month across every account.
    setFilters((f) => lookAt(f, f.account === name ? "" : name));
  }

  const anchorDay = parseAnchor(filters.anchor);
  const cycle =
    filters.period === "cycle" && filters.cut ? cycleContaining(filters.cut, anchorDay) : null;
  const span = cycle ? null : resolvePeriod(filters.period as PeriodKind, anchorDay);
  const spanLabel = cycle
    ? t.wallet.cycleRange(
        shortDay(dayKey(cycle.start), locale),
        shortDay(dayKey(cycle.statementDate), locale)
      )
    : formatPeriodLabel(span!, locale) ?? t.home.allTime;
  // A span that already contains today has no "next" to walk into.
  const atLatest = (cycle ? cycle.end : span!.range.to).getTime() > openedAt;
  const rangeFrom = cycle ? cycle.start : span!.range.from;

  function step(dir: -1 | 1) {
    setFilters((f) => {
      const day = parseAnchor(f.anchor);
      const next =
        f.period === "cycle" && f.cut
          ? stepCycle(f.cut, cycleContaining(f.cut, day), dir).statementDate
          : stepAnchor(f.period as PeriodKind, day, dir);
      return { ...f, anchor: dayKey(next), page: 1 };
    });
  }

  function openPicker() {
    setPickerYear(filters.period === "all" ? todayAnchor().getUTCFullYear() : rangeFrom.getUTCFullYear());
    setPickerOpen(true);
  }

  function collapse() {
    setExpanded(false);
    // Folding a long list back leaves the reader far below it; bring its top
    // back into view, but only if it has scrolled out.
    const top = listRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) listRef.current?.scrollIntoView({ block: "start" });
  }

  const total = transactions?.total ?? 0;
  const canExpand = (transactions?.data.length ?? 0) > PREVIEW;
  const shown: PaginatedTransactions | null = transactions
    ? expanded ? transactions : { ...transactions, data: transactions.data.slice(0, PREVIEW) }
    : null;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
        <ChartSkeleton height="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[15px] font-semibold text-text">{t.wallet.title}</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          aria-label={t.wallet.addAccount}
          className="press -my-1.5 -mr-1.5 w-9 h-9 rounded-full flex items-center justify-center text-accent hover:bg-surface-2 transition-colors duration-150 ease-out"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,370px)_1fr] md:gap-8 md:items-start">
        <div>
          <section className="tint tint-gold px-4 pt-3.5 pb-4 mb-4">
            <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
              {t.wallet.totalAvailable}
            </p>
            <p className="text-[30px] font-semibold text-text tabular-nums tracking-[-0.03em] leading-none mt-1.5">
              {formatMXN(dashboard?.totalAvailable ?? 0)}
            </p>
            <p className="text-[11.5px] text-text-dim mt-1.5">{t.home.debitAccounts(debit.length)}</p>
          </section>

          {cards.length > 0 ? (
            <CardStack cards={cards} selected={filters.account} onSelect={pick} />
          ) : (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="press w-full rounded-[18px] border border-dashed border-border-strong flex items-center justify-center gap-2 py-10 text-accent"
            >
              <PlusIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12.5px]">{t.wallet.addAccount}</span>
            </button>
          )}

          <AnimatePresence initial={false} mode="popLayout">
            {/* Waits for the configs: without them a card would read as having
                no cycle, and a payment would start from the wrong account. */}
            {selectedBalance?.isCredit && configs && (
              <motion.div
                key={selectedBalance.account}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1], delay: reduceMotion ? 0 : 0.08 }}
              >
                <CreditDetails
                  account={selectedBalance}
                  cycle={selectedConfig?.cycle ?? null}
                  onPay={() =>
                    pay(payPrefill(selectedBalance.account, selectedConfig?.cycle ?? null, balances))
                  }
                  onEdit={selectedConfig ? () => setEditing(selectedConfig) : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden md:block mt-3">
            <BalancesPanel open={balancesOpen} onToggle={() => setBalancesOpen((v) => !v)} />
          </div>
        </div>

        <section ref={listRef} className="mt-5 md:mt-0 min-w-0 scroll-mt-4">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] truncate">
              {t.movements.title}
              {filters.account && <span className="text-text-muted"> · {filters.account}</span>}
            </p>
            {filters.account && (
              <div className="flex items-center gap-1 shrink-0">
                {selectedConfig && (
                  <button
                    onClick={() => setEditing(selectedConfig)}
                    className="press font-mono text-[10px] font-medium text-accent tracking-wide uppercase px-1"
                  >
                    {t.wallet.editAccount}
                  </button>
                )}
                <button
                  onClick={() => pick(filters.account)}
                  aria-label={t.wallet.allMovements}
                  className="press w-7 h-7 flex items-center justify-center text-text-dim hover:text-text transition-colors duration-150 ease-out"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Which span the list covers, stepped like Inicio's month. The
              label opens the month picker — also the way back from all-time,
              which has nothing to step through. */}
          <div className="flex items-center justify-between panel px-1 py-0.5 mb-2.5">
            <StepButton
              label={t.home.prevPeriod}
              onClick={() => step(-1)}
              disabled={filters.period === "all"}
            >
              ‹
            </StepButton>
            <button
              onClick={openPicker}
              className="press flex-1 self-stretch font-mono text-[11px] font-medium text-text uppercase tracking-wide hover:text-accent transition-colors duration-150 ease-out"
            >
              {spanLabel}
            </button>
            <StepButton
              label={t.home.nextPeriod}
              onClick={() => step(1)}
              disabled={filters.period === "all" || atLatest}
            >
              ›
            </StepButton>
          </div>

          <div className="mb-3">
            <TransactionFiltersPanel
              filters={filters}
              categories={filterOptions?.categories ?? []}
              accounts={filterOptions?.accounts ?? []}
              onChange={(next) =>
                setFilters((f) => (next.account !== f.account ? lookAt(next, next.account) : next))
              }
            />
          </div>

          <div className="panel hidden md:block">
            <TransactionTable
              data={shown}
              loading={txLoading}
              page={filters.page}
              onPageChange={(p) => setFiltersState((f) => ({ ...f, page: p }))}
              paginate={expanded}
            />
            {canExpand && (
              <ExpandToggle expanded={expanded} total={total} onExpand={() => setExpanded(true)} onCollapse={collapse} />
            )}
          </div>
          <div className="panel px-4 pb-2 md:hidden">
            <TransactionList
              data={shown}
              loading={txLoading}
              page={filters.page}
              onPageChange={(p) => setFiltersState((f) => ({ ...f, page: p }))}
              paginate={expanded}
            />
            {canExpand && (
              <ExpandToggle expanded={expanded} total={total} onExpand={() => setExpanded(true)} onCollapse={collapse} />
            )}
          </div>

          <div className="md:hidden mt-3">
            <BalancesPanel open={balancesOpen} onToggle={() => setBalancesOpen((v) => !v)} />
          </div>
        </section>
      </div>

      <MonthPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        year={pickerYear}
        onYearChange={setPickerYear}
        data={yearly}
        loading={yearlyLoading}
        selectedMonth={filters.period === "month" ? monthKey(rangeFrom) : ""}
        onSelect={(month) => {
          setFilters((f) => ({ ...f, period: "month", anchor: `${month}-01`, page: 1 }));
          setPickerOpen(false);
        }}
      />

      <AccountEditSheet
        key={editing === "new" ? "new" : editing?.id ?? "none"}
        account={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />

      {paySheet}
    </div>
  );
}

/** Opens the list past its first ten and folds it back. */
function ExpandToggle({
  expanded, total, onExpand, onCollapse,
}: { expanded: boolean; total: number; onExpand: () => void; onCollapse: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={expanded ? onCollapse : onExpand}
      aria-expanded={expanded}
      className="press w-full flex items-center justify-center gap-1.5 min-h-[44px] border-t border-divider font-mono text-[10.5px] font-medium text-accent uppercase tracking-wide"
    >
      {expanded ? t.movements.showLess : t.movements.showAll(total)}
      <ChevronDownIcon
        className={cn("w-3.5 h-3.5 transition-transform duration-200 ease-out", expanded && "rotate-180")}
      />
    </button>
  );
}

function BalancesPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press panel w-full flex items-center justify-between gap-3 text-left px-4 py-3.5"
      >
        <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {t.wallet.adjustBalances}
        </span>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-text-dim shrink-0 transition-transform duration-200 ease-out",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-300 ease-out",
          open ? "max-h-[3000px] mt-3" : "max-h-0"
        )}
      >
        <InitialBalances onSaved={() => mutate(() => true)} />
      </div>
    </>
  );
}
