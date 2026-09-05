"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatMXN, formatMonth, getCurrentMonth, cn } from "@/lib/utils";
import type { YearlyDashboardData } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  year: number;
  onYearChange: (year: number) => void;
  data: YearlyDashboardData | undefined;
  loading: boolean;
  selectedMonth: string;
  onSelect: (month: string) => void;
}

/** "2026-03" -> "Mar" */
function monthAbbrev(month: string): string {
  return formatMonth(month).split(" ")[0].slice(0, 3);
}

export function MonthPickerSheet({
  open, onClose, year, onYearChange, data, loading, selectedMonth, onSelect,
}: Props) {
  const currentMonth = getCurrentMonth();
  const currentYear = Number(currentMonth.split("-")[0]);
  const nextYearDisabled = year >= currentYear;

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center justify-between pt-1 pb-4">
        <span className="font-mono text-xs font-semibold text-text uppercase tracking-wide">
          Elige un mes
        </span>
        <div className="flex items-center gap-0.5 -my-2 -mr-2">
          <YearNavButton label="Año anterior" onClick={() => onYearChange(year - 1)}>‹</YearNavButton>
          <span className="font-mono text-[13px] font-semibold text-text min-w-[52px] text-center tabular-nums">
            {year}
          </span>
          <YearNavButton label="Año siguiente" onClick={() => onYearChange(year + 1)} disabled={nextYearDisabled}>›</YearNavButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pb-6">
        {Array.from({ length: 12 }, (_, i) => {
          const month = `${year}-${String(i + 1).padStart(2, "0")}`;
          const point = data?.months[i];
          const isFuture = month > currentMonth;
          const isSelected = month === selectedMonth;
          const isPositive = (point?.net ?? 0) >= 0;

          return (
            <button
              key={month}
              disabled={isFuture}
              onClick={() => onSelect(month)}
              className={cn(
                "press flex flex-col items-center gap-1.5 rounded-md py-3 px-1 border transition-colors duration-150 ease-out",
                isFuture
                  ? "border-transparent opacity-30 cursor-not-allowed"
                  : isSelected
                    ? "border-accent bg-accent/12"
                    : "border-border hover:bg-surface-2/60"
              )}
            >
              <span className={cn(
                "font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                isSelected ? "text-accent" : "text-text-dim"
              )}>
                {monthAbbrev(month)}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] font-semibold tabular-nums",
                  !point || !point.hasData || loading
                    ? "text-text-faint"
                    : isPositive ? "text-green-fg" : "text-red-fg"
                )}
              >
                {!point || !point.hasData || loading ? "—" : formatMXN(point.net)}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

function YearNavButton({
  label, onClick, disabled, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="press w-11 h-11 flex items-center justify-center group disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center bg-surface-2 text-text-muted text-xs transition-colors duration-150 ease-out group-hover:bg-surface-3 group-hover:text-text">
        {children}
      </span>
    </button>
  );
}
