"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { InitialBalances } from "@/components/dashboard/InitialBalances";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFiltersPanel } from "@/components/transactions/TransactionFilters";
import { MonthPickerSheet } from "@/components/dashboard/MonthPickerSheet";
import { StepButton } from "@/components/dashboard/PeriodNav";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { TickMeter } from "@/components/ui/TickMeter";
import { useLocale, useT } from "@/lib/i18n-react";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "@/components/shell/icons";
import { AccountEditSheet, type EditableAccount } from "@/components/settings/AccountEditSheet";
import { formatMXN, cn } from "@/lib/utils";
import {
  dayKey, formatPeriodLabel, isPeriodKind, monthKey, parseAnchor, resolvePeriod,
  stepAnchor, todayAnchor, wallClockNow, type PeriodKind,
} from "@/services/period";
import type {
  AccountBalance,
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
  const { data: configs } = useSWR<EditableAccount[]>("/api/accounts", fetcher);

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
  const credit = balances.filter((a) => a.isCredit);
  const selectedConfig = filters.account ? configByAccount.get(filters.account) : undefined;

  function pick(name: string) {
    setFilters((f) =>
      f.account === name
        // Tapping the account already being looked at puts the list back to
        // this month across every account, so the card is its own toggle.
        ? { ...f, ...thisMonth(), account: "", page: 1 }
        // Picking one drops the month with it: an account's history is the
        // point of asking, and half of them see nothing in a given month.
        : { ...f, account: name, period: "all", page: 1 }
    );
  }

  const span = resolvePeriod(filters.period, parseAnchor(filters.anchor));
  const spanLabel = formatPeriodLabel(span, locale) ?? t.home.allTime;
  // A span that already contains today has no "next" to walk into.
  const atLatest = span.range.to.getTime() > openedAt;

  function step(dir: -1 | 1) {
    setFilters((f) => ({
      ...f,
      anchor: dayKey(stepAnchor(f.period, parseAnchor(f.anchor), dir)),
      page: 1,
    }));
  }

  function openPicker() {
    setPickerYear(filters.period === "all" ? todayAnchor().getUTCFullYear() : span.range.from.getUTCFullYear());
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
      <h1 className="text-[15px] font-semibold text-text mb-3">{t.wallet.title}</h1>

      <div className="md:grid md:grid-cols-[minmax(0,370px)_1fr] md:gap-8 md:items-start">
        <div>
          <section className="tint tint-gold px-4 pt-3.5 pb-4">
            <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
              {t.wallet.totalAvailable}
            </p>
            <p className="text-[30px] font-semibold text-text tabular-nums tracking-[-0.03em] leading-none mt-1.5">
              {formatMXN(dashboard?.totalAvailable ?? 0)}
            </p>
            <p className="text-[11.5px] text-text-dim mt-1.5">{t.home.debitAccounts(debit.length)}</p>
          </section>

          <GroupLabel>{t.wallet.debit}</GroupLabel>
          <div className="grid grid-cols-2 gap-2.5">
            {debit.map((a) => (
              <AccountCard
                key={a.account}
                account={a}
                selected={filters.account === a.account}
                onSelect={() => pick(a.account)}
              />
            ))}
            <button
              type="button"
              onClick={() => setEditing("new")}
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
                    selected={filters.account === a.account}
                    onSelect={() => pick(a.account)}
                  />
                ))}
              </div>
            </>
          )}

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
              onChange={(next) => setFilters(() => next)}
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
        selectedMonth={filters.period === "month" ? monthKey(span.range.from) : ""}
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
