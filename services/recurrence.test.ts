import { describe, expect, it } from "vitest";
import {
  dueOccurrences, firstOnOrAfter, isOccurrence, monthlyEquivalent, nextAfter, occurrenceAt,
  parseDay, type Schedule,
} from "./recurrence";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const k = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);

function monthly(anchor: string, extra: Partial<Schedule> = {}): Schedule {
  return { frequency: "monthly", interval: 1, anchorDate: d(anchor), dayOfMonth: null, endDate: null, ...extra };
}

describe("occurrenceAt", () => {
  it("monthly on the 31st clamps to the end of short months", () => {
    const s = monthly("2026-01-31");
    expect([0, 1, 2, 3, 4].map((n) => k(occurrenceAt(s, n)))).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31",
    ]);
  });

  it("goes back to the 31st after a clamp instead of sticking to the 28th", () => {
    const s = monthly("2026-01-31");
    expect(k(nextAfter(s, d("2026-02-28")))).toBe("2026-03-31");
  });

  it("lands on 29 Feb in a leap year", () => {
    expect(k(occurrenceAt(monthly("2028-01-31"), 1))).toBe("2028-02-29");
    expect(k(occurrenceAt(monthly("2028-01-30"), 1))).toBe("2028-02-29");
  });

  it("crosses the year", () => {
    expect(k(occurrenceAt(monthly("2026-11-15"), 2))).toBe("2027-01-15");
  });

  it("every 2 months", () => {
    const s = monthly("2026-01-10", { interval: 2 });
    expect([0, 1, 2].map((n) => k(occurrenceAt(s, n)))).toEqual(["2026-01-10", "2026-03-10", "2026-05-10"]);
  });

  it("an explicit day of month wins over the anchor's", () => {
    expect(k(occurrenceAt(monthly("2026-02-28", { dayOfMonth: 31 }), 1))).toBe("2026-03-31");
  });

  it("weekly keeps the weekday", () => {
    const s: Schedule = { frequency: "weekly", interval: 1, anchorDate: d("2026-10-05"), dayOfMonth: null, endDate: null };
    expect([0, 1, 4].map((n) => k(occurrenceAt(s, n)))).toEqual(["2026-10-05", "2026-10-12", "2026-11-02"]);
  });

  it("yearly on 29 Feb falls on the 28th in common years", () => {
    const s: Schedule = { frequency: "yearly", interval: 1, anchorDate: d("2028-02-29"), dayOfMonth: null, endDate: null };
    expect([0, 1, 4].map((n) => k(occurrenceAt(s, n)))).toEqual(["2028-02-29", "2029-02-28", "2032-02-29"]);
  });
});

describe("firstOnOrAfter / nextAfter", () => {
  it("returns the day itself when it is an occurrence", () => {
    expect(k(firstOnOrAfter(monthly("2026-01-03"), d("2026-10-03")))).toBe("2026-10-03");
  });

  it("finds the next one otherwise", () => {
    expect(k(firstOnOrAfter(monthly("2026-01-03"), d("2026-10-04")))).toBe("2026-11-03");
  });

  it("before the anchor, the anchor is first", () => {
    expect(k(firstOnOrAfter(monthly("2026-12-01"), d("2026-01-01")))).toBe("2026-12-01");
  });

  it("stops at the end date, which is included", () => {
    const s = monthly("2026-01-15", { endDate: d("2026-03-15") });
    expect(k(nextAfter(s, d("2026-02-15")))).toBe("2026-03-15");
    expect(nextAfter(s, d("2026-03-15"))).toBeNull();
  });

  it("is fast on an old weekly rule", () => {
    const s: Schedule = { frequency: "weekly", interval: 1, anchorDate: d("2000-01-03"), dayOfMonth: null, endDate: null };
    expect(k(firstOnOrAfter(s, d("2026-10-04")))).toBe("2026-10-05");
  });
});

describe("isOccurrence", () => {
  it("knows the clamped day is one", () => {
    expect(isOccurrence(monthly("2026-01-31"), d("2026-02-28"))).toBe(true);
    expect(isOccurrence(monthly("2026-01-31"), d("2026-02-27"))).toBe(false);
  });
});

describe("dueOccurrences", () => {
  it("a monthly rule on day 31 shows in February on the 28th", () => {
    const s = monthly("2026-01-31");
    expect(dueOccurrences(s, d("2026-02-01"), d("2026-02-27")).map(k)).toEqual([]);
    expect(dueOccurrences(s, d("2026-02-01"), d("2026-02-28")).map(k)).toEqual(["2026-02-28"]);
  });

  it("and on the 29th in a leap year", () => {
    const s = monthly("2028-01-31");
    expect(dueOccurrences(s, d("2028-02-01"), d("2028-02-29")).map(k)).toEqual(["2028-02-29"]);
  });

  it("catches up on everything missed, oldest first", () => {
    const s = monthly("2026-01-03");
    expect(dueOccurrences(s, d("2026-07-03"), d("2026-10-04")).map(k)).toEqual([
      "2026-07-03", "2026-08-03", "2026-09-03", "2026-10-03",
    ]);
  });

  it("caps the catch-up", () => {
    const s: Schedule = { frequency: "weekly", interval: 1, anchorDate: d("2020-01-06"), dayOfMonth: null, endDate: null };
    expect(dueOccurrences(s, d("2020-01-06"), d("2026-10-04"), 5)).toHaveLength(5);
  });

  it("nothing past the end date", () => {
    const s = monthly("2026-01-03", { endDate: d("2026-08-31") });
    expect(dueOccurrences(s, d("2026-07-03"), d("2026-10-04")).map(k)).toEqual(["2026-07-03", "2026-08-03"]);
  });

  it("nothing before the anchor", () => {
    expect(dueOccurrences(monthly("2026-11-01"), d("2026-11-01"), d("2026-10-04"))).toEqual([]);
  });
});

describe("monthlyEquivalent", () => {
  it("monthly is itself, every 2 months is half", () => {
    expect(monthlyEquivalent(129, "monthly", 1)).toBe(129);
    expect(monthlyEquivalent(300, "monthly", 2)).toBe(150);
  });

  it("weekly counts 52 weeks, not 4 a month", () => {
    expect(monthlyEquivalent(100, "weekly", 1)).toBe(433.33);
  });

  it("yearly is a twelfth", () => {
    expect(monthlyEquivalent(1200, "yearly", 1)).toBe(100);
  });
});

describe("parseDay", () => {
  it("accepts a real day and refuses the rest", () => {
    expect(k(parseDay("2026-02-28"))).toBe("2026-02-28");
    expect(parseDay("2026-02-31")).toBeNull();
    expect(parseDay("2026-2-3")).toBeNull();
    expect(parseDay(20260203)).toBeNull();
  });
});
