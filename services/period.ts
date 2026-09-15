/**
 * Everything in the app used to be keyed by a `"YYYY-MM"` string, which made
 * "this month" the only question it could answer. This turns a named period
 * into a concrete half-open range, so week, year and all-time cost the same
 * as a month.
 *
 * Every boundary is pinned to UTC, because transaction rows store a local
 * wall clock pinned to UTC (see `lib/transaction-input.ts`). Comparing them
 * against local-time boundaries would put a movement in the wrong bucket for
 * anyone east or west of the server.
 */

export type PeriodKind = "week" | "month" | "year" | "all";

export const PERIOD_KINDS: PeriodKind[] = ["week", "month", "year", "all"];

export function isPeriodKind(value: string): value is PeriodKind {
  return (PERIOD_KINDS as string[]).includes(value);
}

/** Half-open: `from` is included, `to` is not. */
export interface DateRange {
  from: Date;
  to: Date;
}

export interface Period {
  kind: PeriodKind;
  range: DateRange;
  /**
   * The same span immediately before, for "up 12% on last month". Null for
   * all-time, which has nothing before it to compare against.
   */
  previous: DateRange | null;
  /** How the range slices for a chart. */
  bucket: "day" | "month";
}

/** Nothing in this app predates 2020, and Date(0) is a safe floor regardless. */
const BEGINNING = new Date(0);

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function startOfUTCDay(d: Date): Date {
  return utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Monday, matching how weeks are read in Spanish and most of the world. */
function startOfUTCWeek(d: Date): Date {
  const day = startOfUTCDay(d);
  // getUTCDay is 0 for Sunday, so Sunday has to walk back six days, not none.
  const weekday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - weekday);
  return day;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

/**
 * Turns a named period into dates. `anchor` is the day being looked at —
 * "the month containing this date" — so navigating back a month is a matter
 * of moving the anchor, not of special-casing the period.
 */
export function resolvePeriod(kind: PeriodKind, anchor: Date = new Date()): Period {
  switch (kind) {
    case "week": {
      const from = startOfUTCWeek(anchor);
      const to = addDays(from, 7);
      return {
        kind,
        range: { from, to },
        previous: { from: addDays(from, -7), to: from },
        bucket: "day",
      };
    }

    case "month": {
      const y = anchor.getUTCFullYear();
      const m = anchor.getUTCMonth();
      return {
        kind,
        range: { from: utc(y, m, 1), to: utc(y, m + 1, 1) },
        previous: { from: utc(y, m - 1, 1), to: utc(y, m, 1) },
        bucket: "day",
      };
    }

    case "year": {
      const y = anchor.getUTCFullYear();
      return {
        kind,
        range: { from: utc(y, 0, 1), to: utc(y + 1, 0, 1) },
        previous: { from: utc(y - 1, 0, 1), to: utc(y, 0, 1) },
        bucket: "month",
      };
    }

    case "all": {
      // Through the end of the anchor's day, so today's movements count.
      const to = addDays(startOfUTCDay(anchor), 1);
      return {
        kind,
        range: { from: BEGINNING, to },
        previous: null,
        bucket: "month",
      };
    }
  }
}

export interface Bucket {
  /** `YYYY-MM-DD` for day buckets, `YYYY-MM` for month buckets. */
  key: string;
  range: DateRange;
}

/**
 * The slices a chart draws, in order. Labels are deliberately absent: they
 * need the reader's language, which lives on the client, while this runs on
 * the server.
 */
export function bucketsFor(period: Period, earliest?: Date): Bucket[] {
  const buckets: Bucket[] = [];

  // All-time has no real start, so it begins at the first movement there is.
  // Without that it would try to draw a bucket per month since 1970.
  const start =
    period.kind === "all"
      ? startOfUTCMonth(earliest ?? period.range.to)
      : period.range.from;

  if (period.bucket === "day") {
    for (let d = new Date(start); d < period.range.to; d = addDays(d, 1)) {
      buckets.push({ key: dayKey(d), range: { from: new Date(d), to: addDays(d, 1) } });
    }
    return buckets;
  }

  for (
    let d = startOfUTCMonth(start);
    d < period.range.to;
    d = utc(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
  ) {
    const next = utc(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    buckets.push({ key: monthKey(d), range: { from: new Date(d), to: next } });
  }
  return buckets;
}

function startOfUTCMonth(d: Date): Date {
  return utc(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** `YYYY-MM-DD` or a full ISO string; anything else falls back to today. */
export function parseAnchor(raw: string | null): Date {
  if (!raw) return new Date();
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
