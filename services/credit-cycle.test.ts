import { describe, expect, it } from "vitest";
import {
  computeCycleInfo, cycleContaining, dayKeyOf, daysBetween, dueTone, getCycle, getDueDate,
  parseCycleDay, stepCycle, type Cycle,
} from "./credit-cycle";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const keys = (c: Cycle) => ({
  start: dayKeyOf(c.start),
  cut: dayKeyOf(c.statementDate),
  end: dayKeyOf(c.end),
});

describe("getCycle", () => {
  it("Nu, cut on the 20th, read on 2 Oct", () => {
    const { open, closed } = getCycle(20, d("2026-10-02"));
    expect(keys(open)).toEqual({ start: "2026-09-21", cut: "2026-10-20", end: "2026-10-21" });
    expect(keys(closed)).toEqual({ start: "2026-08-21", cut: "2026-09-20", end: "2026-09-21" });
  });

  it("the cut day itself still belongs to the cycle it closes", () => {
    expect(keys(getCycle(20, d("2026-09-20")).open).cut).toBe("2026-09-20");
    expect(keys(getCycle(20, d("2026-09-21")).open).cut).toBe("2026-10-20");
  });

  it("a cycle can start and end inside the same calendar month", () => {
    const { open } = getCycle(31, d("2026-03-15"));
    expect(keys(open)).toEqual({ start: "2026-03-01", cut: "2026-03-31", end: "2026-04-01" });
  });

  it("day 31 clamps to the last day of shorter months", () => {
    expect(keys(cycleContaining(31, d("2026-02-10")))).toEqual({
      start: "2026-02-01", cut: "2026-02-28", end: "2026-03-01",
    });
    expect(keys(cycleContaining(31, d("2026-04-30"))).cut).toBe("2026-04-30");
    expect(keys(cycleContaining(31, d("2026-05-01")))).toEqual({
      start: "2026-05-01", cut: "2026-05-31", end: "2026-06-01",
    });
  });

  it("leap years keep 29 Feb", () => {
    expect(keys(cycleContaining(30, d("2028-02-15")))).toEqual({
      start: "2028-01-31", cut: "2028-02-29", end: "2028-03-01",
    });
    expect(keys(cycleContaining(29, d("2027-02-15"))).cut).toBe("2027-02-28");
    expect(keys(cycleContaining(29, d("2027-03-01")))).toEqual({
      start: "2027-03-01", cut: "2027-03-29", end: "2027-03-30",
    });
  });

  it("crosses the year", () => {
    const { open, closed } = getCycle(5, d("2027-01-03"));
    expect(keys(open)).toEqual({ start: "2026-12-06", cut: "2027-01-05", end: "2027-01-06" });
    expect(keys(closed).cut).toBe("2026-12-05");
  });

  it("stepping walks one cycle at a time", () => {
    const c = cycleContaining(31, d("2026-01-15"));
    const next = stepCycle(31, c, 1);
    expect(keys(next)).toEqual({ start: "2026-02-01", cut: "2026-02-28", end: "2026-03-01" });
    expect(keys(stepCycle(31, next, 1)).cut).toBe("2026-03-31");
    expect(keys(stepCycle(31, c, -1)).cut).toBe("2025-12-31");
  });
});

describe("getDueDate", () => {
  const closedOn = (statementDay: number, cut: string) => cycleContaining(statementDay, d(cut));

  it("due day after the cut falls in the same month", () => {
    expect(dayKeyOf(getDueDate(20, 30, closedOn(20, "2026-09-20")))).toBe("2026-09-30");
  });

  it("due day on or before the cut rolls into the next month", () => {
    expect(dayKeyOf(getDueDate(25, 15, closedOn(25, "2026-09-25")))).toBe("2026-10-15");
    expect(dayKeyOf(getDueDate(20, 20, closedOn(20, "2026-09-20")))).toBe("2026-10-20");
    expect(dayKeyOf(getDueDate(20, 5, closedOn(20, "2026-12-20")))).toBe("2027-01-05");
  });

  it("clamps the due day in a short month", () => {
    expect(dayKeyOf(getDueDate(10, 31, closedOn(10, "2026-02-10")))).toBe("2026-02-28");
    expect(dayKeyOf(getDueDate(31, 30, closedOn(31, "2026-01-31")))).toBe("2026-02-28");
  });

  it("never lands on or before the cut", () => {
    // Cut clamps to 28 Feb, due day 30 clamps to 28 Feb too: push a month.
    expect(dayKeyOf(getDueDate(28, 30, closedOn(28, "2026-02-28")))).toBe("2026-03-30");
  });
});

describe("computeCycleInfo", () => {
  it("Nu in September: owed 3,618 at the cut, paid 3,618 on the 25th", () => {
    const info = computeCycleInfo(20, 30, d("2026-10-02"), {
      balanceAtCut: -3618,
      paidSinceStatement: 3618,
      currentCycleSpend: 0,
    });
    expect(info).toMatchObject({
      lastStatementDate: "2026-09-20",
      nextStatementDate: "2026-10-20",
      cycleStart: "2026-09-21",
      cycleEnd: "2026-10-20",
      dueDate: "2026-09-30",
      statementBalance: 3618,
      remainingToPay: 0,
      daysUntilDue: -2,
    });
    expect(dueTone(info)).toBe("paid");
  });

  it("unpaid and past the due date is overdue", () => {
    const info = computeCycleInfo(20, 30, d("2026-10-02"), {
      balanceAtCut: -3618, paidSinceStatement: 1000, currentCycleSpend: 250.5,
    });
    expect(info.remainingToPay).toBe(2618);
    expect(info.currentCycleSpend).toBe(250.5);
    expect(dueTone(info)).toBe("overdue");
  });

  it("a card in credit at the cut owes nothing", () => {
    const info = computeCycleInfo(20, 30, d("2026-10-02"), {
      balanceAtCut: 151, paidSinceStatement: 0, currentCycleSpend: 0,
    });
    expect(info.statementBalance).toBe(0);
    expect(info.remainingToPay).toBe(0);
  });

  it("overpaying floors remaining at zero", () => {
    const info = computeCycleInfo(20, 30, d("2026-09-25"), {
      balanceAtCut: -500, paidSinceStatement: 800, currentCycleSpend: 0,
    });
    expect(info.remainingToPay).toBe(0);
  });

  it("without a due day there is no due date or countdown", () => {
    const info = computeCycleInfo(20, null, d("2026-10-02"), {
      balanceAtCut: -100, paidSinceStatement: 0, currentCycleSpend: 0,
    });
    expect(info.dueDate).toBeNull();
    expect(info.daysUntilDue).toBeNull();
    expect(dueTone(info)).toBeNull();
  });
});

describe("dueTone", () => {
  it("bands by days left", () => {
    expect(dueTone({ remainingToPay: 10, daysUntilDue: 5 })).toBe("ok");
    expect(dueTone({ remainingToPay: 10, daysUntilDue: 4 })).toBe("soon");
    expect(dueTone({ remainingToPay: 10, daysUntilDue: 0 })).toBe("soon");
    expect(dueTone({ remainingToPay: 10, daysUntilDue: -1 })).toBe("overdue");
    expect(dueTone({ remainingToPay: 0, daysUntilDue: -1 })).toBe("paid");
  });
});

describe("helpers", () => {
  it("daysBetween counts whole days", () => {
    expect(daysBetween(d("2026-10-02"), d("2026-10-20"))).toBe(18);
    expect(daysBetween(d("2026-10-02"), d("2026-09-30"))).toBe(-2);
  });

  it("parseCycleDay accepts 1–31 only", () => {
    expect(parseCycleDay("20")).toBe(20);
    expect(parseCycleDay(31)).toBe(31);
    expect(parseCycleDay("")).toBeNull();
    expect(parseCycleDay(0)).toBeNull();
    expect(parseCycleDay(32)).toBeNull();
    expect(parseCycleDay("2.5")).toBeNull();
  });
});
