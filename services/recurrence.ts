/**
 * When a recurring movement comes due. Pure date math, no I/O, on the same
 * convention as the rest of the app: every date is a UTC midnight standing for
 * a wall-clock day (see `services/period.ts`).
 *
 * Every occurrence is counted from the anchor — the nth one is "anchor plus n
 * steps" — rather than from the occurrence before it. Chaining would let a
 * clamp stick: a rule on the 31st falls on 28 Feb, and "a month after 28 Feb"
 * is 28 Mar, not 31 Mar. Counting from the anchor puts it back on the 31st.
 */

import { addDays, clampedDay } from "./credit-cycle";
import { round2 } from "./finance";

export type Frequency = "weekly" | "monthly" | "yearly";

export const FREQUENCIES: Frequency[] = ["weekly", "monthly", "yearly"];

export function isFrequency(value: unknown): value is Frequency {
  return typeof value === "string" && (FREQUENCIES as string[]).includes(value);
}

/** Every N weeks, months or years. More than a year of weeks is a typo. */
export const MAX_INTERVAL = 52;

export interface Schedule {
  frequency: Frequency;
  interval: number;
  /** The first occurrence. */
  anchorDate: Date;
  /** Monthly and yearly: 1–31, clamped in shorter months. Null for weekly. */
  dayOfMonth: number | null;
  /** Last day an occurrence may fall on, included. */
  endDate: Date | null;
}

/** A catch-up after months away still stops somewhere. */
export const MAX_CATCH_UP = 60;

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The day of the month a schedule lands on, from the anchor when none is set. */
function dayFor(schedule: Schedule): number {
  return schedule.dayOfMonth ?? schedule.anchorDate.getUTCDate();
}

/** The nth occurrence, n = 0 being the anchor itself. */
export function occurrenceAt(schedule: Schedule, n: number): Date {
  const anchor = utcDay(schedule.anchorDate);
  const step = schedule.interval * n;
  switch (schedule.frequency) {
    case "weekly":
      return addDays(anchor, 7 * step);
    case "monthly": {
      // Date.UTC folds a month past 11 into the next year; clampedDay needs
      // the folded year and month, so let it fold first.
      const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + step, 1));
      return clampedDay(first.getUTCFullYear(), first.getUTCMonth(), dayFor(schedule));
    }
    case "yearly":
      return clampedDay(anchor.getUTCFullYear() + step, anchor.getUTCMonth(), dayFor(schedule));
  }
}

/** Past the end date, an occurrence doesn't exist. */
function withinEnd(schedule: Schedule, d: Date): boolean {
  return schedule.endDate === null || d.getTime() <= utcDay(schedule.endDate).getTime();
}

/**
 * A rough count of steps from the anchor to `day`, always at or below the
 * real one, so a search can start near the answer instead of at the anchor —
 * a weekly rule five years old would otherwise walk 260 steps every read.
 */
function stepsBefore(schedule: Schedule, day: Date): number {
  const anchor = utcDay(schedule.anchorDate);
  if (day.getTime() <= anchor.getTime()) return 0;
  const months =
    (day.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (day.getUTCMonth() - anchor.getUTCMonth());
  const raw =
    schedule.frequency === "weekly"
      ? Math.floor((day.getTime() - anchor.getTime()) / (7 * 86_400_000))
      : schedule.frequency === "monthly"
        ? months
        : Math.floor(months / 12);
  return Math.max(0, Math.floor(raw / schedule.interval) - 1);
}

/** The first occurrence on or after `day`, or null once the rule has ended. */
export function firstOnOrAfter(schedule: Schedule, day: Date): Date | null {
  const target = utcDay(day).getTime();
  for (let n = stepsBefore(schedule, day); ; n++) {
    const occurrence = occurrenceAt(schedule, n);
    if (!withinEnd(schedule, occurrence)) return null;
    if (occurrence.getTime() >= target) return occurrence;
  }
}

/** The occurrence after a given one, or null once the rule has ended. */
export function nextAfter(schedule: Schedule, occurrence: Date): Date | null {
  return firstOnOrAfter(schedule, addDays(utcDay(occurrence), 1));
}

/** Whether `day` is exactly one of the schedule's occurrences. */
export function isOccurrence(schedule: Schedule, day: Date): boolean {
  const hit = firstOnOrAfter(schedule, day);
  return hit !== null && hit.getTime() === utcDay(day).getTime();
}

/**
 * Every occurrence from `from` through `today`, oldest first: what's waiting
 * to be confirmed. Capped, so a rule left alone for years can't flood the
 * screen — the oldest ones come first, and confirming them reveals the rest.
 */
export function dueOccurrences(
  schedule: Schedule,
  from: Date,
  today: Date,
  limit = MAX_CATCH_UP
): Date[] {
  const end = utcDay(today).getTime();
  const out: Date[] = [];
  let next = firstOnOrAfter(schedule, from);
  while (next && next.getTime() <= end && out.length < limit) {
    out.push(next);
    next = nextAfter(schedule, next);
  }
  return out;
}

/**
 * What a rule costs in an average month, for the "fixed spend" figure. A
 * weekly charge happens 52 times a year, not 4 times a month.
 */
export function monthlyEquivalent(amount: number, frequency: Frequency, interval: number): number {
  const perYear =
    frequency === "weekly" ? 52 / interval : frequency === "monthly" ? 12 / interval : 1 / interval;
  return round2((amount * perYear) / 12);
}

/** `YYYY-MM-DD` from a form, as a UTC midnight. Null for anything else. */
export function parseDay(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  // Reject 2026-02-31, which Date would roll into March.
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? null : d;
}
