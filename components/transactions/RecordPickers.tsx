"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Ellipsis } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { cn, formatMXN, getToday } from "@/lib/utils";
import { currentLocale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-react";
import { UNKNOWN_COLOR, type AccountOption, type Category } from "@/types";

/** Two rows of five, the last cell being "more" when there is more. */
const COLLAPSED_COUNT = 9;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Categories as a grid of icons, most used first, so the usual one is a
 * thumb's reach from the amount. The rest fold behind "more".
 */
export function CategoryGrid({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (name: string) => void;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  // An edited movement whose category sits past the fold opens unfolded, so
  // the current answer is never hidden.
  const selectedIndex = categories.findIndex((c) => c.name === value);
  const [expanded, setExpanded] = useState(selectedIndex >= COLLAPSED_COUNT);

  const overflow = categories.length > COLLAPSED_COUNT + 1;
  const visible = overflow && !expanded ? categories.slice(0, COLLAPSED_COUNT) : categories;

  if (categories.length === 0) {
    return <p className="text-[13px] text-text-dim text-center py-4">{t.txSheet.noCategories}</p>;
  }

  return (
    <motion.div
      role="radiogroup"
      aria-label={t.common.category}
      className="grid grid-cols-5 gap-y-3"
      layout={!reduceMotion}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      <AnimatePresence initial={false}>
        {visible.map((c) => {
          const selected = c.name === value;
          return (
            <motion.button
              key={c.id}
              layout={!reduceMotion ? "position" : false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(c.name)}
              // whileTap, not .press: Motion owns this element's transform for
              // the layout animation and would overwrite the :active scale.
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              className="relative flex flex-col items-center gap-1.5 min-w-0 px-0.5"
            >
              <CategoryIcon
                icon={c.icon}
                name={c.name}
                color={c.color}
                size="lg"
              />
              <span
                className={cn(
                  "w-full text-[11px] leading-tight truncate text-center transition-colors duration-150",
                  selected ? "text-text font-semibold" : "text-text-dim"
                )}
              >
                {c.name}
              </span>
              <SelectionRing show={selected} color={c.color} />
            </motion.button>
          );
        })}
      </AnimatePresence>

      {overflow && (
        <motion.button
          layout={!reduceMotion ? "position" : false}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          whileTap={reduceMotion ? undefined : { scale: 0.95 }}
          className="flex flex-col items-center gap-1.5 min-w-0"
        >
          <span className="w-11 h-11 rounded-full grid place-items-center bg-surface-2 text-text-dim">
            {expanded ? <ChevronDown size={20} className="rotate-180" /> : <Ellipsis size={20} />}
          </span>
          <span className="text-[11px] leading-tight text-text-dim">
            {expanded ? t.txSheet.lessCategories : t.txSheet.moreCategories}
          </span>
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * The selected category's ring: its own circle laid over the icon, so
 * selecting never nudges the grid, and it can scale in on its own.
 */
function SelectionRing({ show, color }: { show: boolean; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-[-4px] left-1/2 -ml-[26px] w-[52px] h-[52px] rounded-full transition-[opacity,transform] duration-150"
      style={{
        boxShadow: `0 0 0 2px ${color}`,
        opacity: show ? 1 : 0,
        transform: show ? "scale(1)" : "scale(0.9)",
      }}
    />
  );
}

/**
 * The account the movement comes from, as a pill under the amount — what it
 * holds rides along, and the pill turns red when the amount is more than
 * that, the moment the number is typed rather than after the fact.
 */
export function AccountPill({
  account,
  over,
  onClick,
  label,
}: {
  account: AccountOption | undefined;
  over: boolean;
  onClick: () => void;
  label: string;
}) {
  const t = useT();
  if (!account) return null;
  const figure = account.isCredit && account.availableCredit !== null
    ? `${formatMXN(account.availableCredit)} ${t.txSheet.available}`
    : formatMXN(account.balance);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${account.account}, ${figure}`}
      className={cn(
        "press inline-flex items-center gap-2 max-w-full rounded-full pl-2.5 pr-3 min-h-[40px] border",
        "transition-colors duration-150",
        over ? "bg-red-bg border-red-border text-red-fg" : "bg-surface-2 border-border text-text"
      )}
    >
      <span
        aria-hidden="true"
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: account.color ?? UNKNOWN_COLOR }}
      />
      <span className="text-[14px] font-medium truncate">{account.account}</span>
      <span className={cn("text-[13px] tabular-nums shrink-0", over ? "text-red-fg" : "text-text-dim")}>
        · {figure}
      </span>
      <ChevronDown size={14} className="shrink-0 opacity-70" />
    </button>
  );
}

/** Every account as a row, for the pill to open onto. */
export function AccountList({
  accounts,
  value,
  exclude,
  onChange,
  title,
}: {
  accounts: AccountOption[];
  value: string;
  exclude?: string;
  onChange: (account: string) => void;
  title: string;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={title}>
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {accounts
          .filter((a) => a.account !== exclude)
          .map((a) => {
            const selected = a.account === value;
            return (
              <button
                key={a.account}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(a.account)}
                className={cn(
                  "press w-full flex items-center gap-3 rounded-md px-3 min-h-[52px] text-left transition-colors duration-150",
                  selected ? "bg-surface-2" : "active:bg-surface-2/60"
                )}
              >
                <span
                  aria-hidden="true"
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: a.color ?? UNKNOWN_COLOR }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] text-text truncate">{a.account}</span>
                  {a.isCredit && (
                    <span className="block text-[11.5px] text-text-dim">{t.txSheet.creditCard}</span>
                  )}
                </span>
                <span className="text-[13.5px] tabular-nums text-text-dim shrink-0">
                  {a.isCredit && a.availableCredit !== null
                    ? `${formatMXN(a.availableCredit)} ${t.txSheet.available}`
                    : formatMXN(a.balance)}
                </span>
                <span className="w-5 shrink-0 text-accent">
                  {selected && <Check size={18} strokeWidth={2.4} />}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

/** `YYYY-MM-DD`, `n` local days before `day`. */
function daysBefore(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - n));
  return date.toISOString().slice(0, 10);
}

/** "Hoy", "Ayer", or a short weekday and day ("mié 30"). */
export function useDayLabel() {
  const t = useT();
  return (day: string): string => {
    const today = getToday();
    if (day === today) return t.dates.today;
    if (day === daysBefore(today, 1)) return t.dates.yesterday;
    const [y, m, d] = day.split("-").map(Number);
    return new Intl.DateTimeFormat(currentLocale(), {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  };
}

/**
 * The last week as chips — almost every movement lands in it — and the full
 * date picker for anything older. Never later than today.
 */
export function DatePanel({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const t = useT();
  const label = useDayLabel();
  const today = getToday();
  const recent = Array.from({ length: 7 }, (_, i) => daysBefore(today, i));
  const isOlder = !recent.includes(value);

  return (
    <div>
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-2">
        {t.common.date}
      </p>
      <div role="radiogroup" aria-label={t.common.date} className="flex flex-wrap gap-2">
        {recent.map((day) => {
          const selected = day === value;
          return (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(day)}
              className={cn(
                "press rounded-full px-3.5 min-h-[40px] text-[13.5px] border transition-colors duration-150",
                selected
                  ? "bg-accent text-accent-ink border-transparent font-semibold"
                  : "bg-surface-2 border-border text-text"
              )}
            >
              {label(day)}
            </button>
          );
        })}
      </div>
      <label className="mt-3 flex items-center justify-between gap-3 rounded-md bg-surface-2 border border-border px-3.5 min-h-[48px]">
        <span className={cn("text-[13.5px]", isOlder ? "text-text" : "text-text-dim")}>
          {t.txSheet.otherDate}
        </span>
        <input
          type="date"
          value={value}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label={t.txSheet.otherDate}
          className="bg-transparent text-[14px] text-text outline-none tabular-nums"
        />
      </label>
    </div>
  );
}
