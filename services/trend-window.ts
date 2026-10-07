/**
 * Which months the trend charts on Analytics cover. Pure date math on the UTC wall-clock convention of
 * `services/period.ts`.
 */
import { monthKey, type DateRange, type PeriodKind } from "./period";

function utcMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

/**
 * Which months the trend charts cover for a period. They need more than one
 * month to be a trend, so a week or a month reads as the six months ending
 * with it; a year is its own twelve; all-time is the last twelve.
 */
export function trendWindow(kind: PeriodKind, anchor: Date): { months: string[]; range: DateRange } {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const [first, count] =
    kind === "year" ? [utcMonth(y, 0), 12] : kind === "all" ? [utcMonth(y, m - 11), 12] : [utcMonth(y, m - 5), 6];
  const months = Array.from({ length: count }, (_, i) =>
    monthKey(utcMonth(first.getUTCFullYear(), first.getUTCMonth() + i))
  );
  return {
    months,
    range: { from: first, to: utcMonth(first.getUTCFullYear(), first.getUTCMonth() + count) },
  };
}
