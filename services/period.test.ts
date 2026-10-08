import { describe, expect, it } from "vitest";
import { comparablePrevious, isInProgress, resolvePeriod } from "./period";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (r: { from: Date; to: Date } | null) =>
  r && { from: r.from.toISOString().slice(0, 10), to: r.to.toISOString().slice(0, 10) };

describe("comparablePrevious", () => {
  it("cuts last month to the same day while this one is running", () => {
    const period = resolvePeriod("month", d("2026-10-07"));
    expect(iso(comparablePrevious(period, d("2026-10-07")))).toEqual({ from: "2026-09-01", to: "2026-09-08" });
  });

  it("caps at the end of a shorter month", () => {
    const period = resolvePeriod("month", d("2026-03-30"));
    expect(iso(comparablePrevious(period, d("2026-03-30")))).toEqual({ from: "2026-02-01", to: "2026-03-01" });
  });

  it("compares a finished month whole", () => {
    const period = resolvePeriod("month", d("2026-09-15"));
    expect(iso(comparablePrevious(period, d("2026-10-07")))).toEqual({ from: "2026-08-01", to: "2026-09-01" });
    // The last day of the month is the whole month already.
    const last = resolvePeriod("month", d("2026-10-31"));
    expect(iso(comparablePrevious(last, d("2026-10-31")))).toEqual({ from: "2026-09-01", to: "2026-10-01" });
  });

  it("cuts a week by days elapsed and a year by date", () => {
    const week = resolvePeriod("week", d("2026-10-07")); // Wed; week starts Mon 5th
    expect(iso(comparablePrevious(week, d("2026-10-07")))).toEqual({ from: "2026-09-28", to: "2026-10-01" });
    const year = resolvePeriod("year", d("2026-10-07"));
    expect(iso(comparablePrevious(year, d("2026-10-07")))).toEqual({ from: "2025-01-01", to: "2025-10-08" });
  });

  it("has nothing before all-time", () => {
    expect(comparablePrevious(resolvePeriod("all", d("2026-10-07")), d("2026-10-07"))).toBeNull();
  });
});

describe("isInProgress", () => {
  it("is true only while today is inside and not the last day", () => {
    expect(isInProgress(resolvePeriod("month", d("2026-10-07")), d("2026-10-07"))).toBe(true);
    expect(isInProgress(resolvePeriod("month", d("2026-09-07")), d("2026-10-07"))).toBe(false);
    expect(isInProgress(resolvePeriod("month", d("2026-10-31")), d("2026-10-31"))).toBe(false);
  });
});

describe("week start", () => {
  it("starts on Monday by default and on Sunday when asked", () => {
    expect(iso(resolvePeriod("week", d("2026-10-07")).range)).toEqual({ from: "2026-10-05", to: "2026-10-12" });
    expect(iso(resolvePeriod("week", d("2026-10-07"), 0).range)).toEqual({ from: "2026-10-04", to: "2026-10-11" });
    // A Sunday is the last day of a Monday week and the first of a Sunday one.
    expect(iso(resolvePeriod("week", d("2026-10-11")).range)?.from).toBe("2026-10-05");
    expect(iso(resolvePeriod("week", d("2026-10-11"), 0).range)?.from).toBe("2026-10-11");
  });
});
