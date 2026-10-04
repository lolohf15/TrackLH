import { describe, expect, it } from "vitest";
import { countWeekdays, trendWindow } from "./trend-window";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("trendWindow", () => {
  it("a month reads as the six months ending with it, across a year", () => {
    const w = trendWindow("month", d("2026-02-10"));
    expect(w.months).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(w.range.from.toISOString().slice(0, 10)).toBe("2025-09-01");
    expect(w.range.to.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("a week uses the six months ending with its anchor's month", () => {
    expect(trendWindow("week", d("2026-10-04")).months.at(-1)).toBe("2026-10");
  });

  it("a year is its own twelve months", () => {
    const w = trendWindow("year", d("2026-06-15"));
    expect(w.months[0]).toBe("2026-01");
    expect(w.months).toHaveLength(12);
    expect(w.range.to.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("all-time is the last twelve", () => {
    const w = trendWindow("all", d("2026-10-04"));
    expect([w.months[0], w.months.at(-1)]).toEqual(["2025-11", "2026-10"]);
  });
});

describe("countWeekdays", () => {
  it("counts Monday first", () => {
    // 1–7 Oct 2026 runs Thursday to Wednesday: one of each.
    expect(countWeekdays({ from: d("2026-10-01"), to: d("2026-10-08") })).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("a partial week only counts the days in it", () => {
    // Thu 1 to Sun 4 Oct.
    expect(countWeekdays({ from: d("2026-10-01"), to: d("2026-10-05") })).toEqual([0, 0, 0, 1, 1, 1, 1]);
  });

  it("a whole month", () => {
    // October 2026: Thursday, Friday and Saturday come five times.
    expect(countWeekdays({ from: d("2026-10-01"), to: d("2026-11-01") })).toEqual([4, 4, 4, 5, 5, 5, 4]);
  });
});
