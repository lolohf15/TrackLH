import { describe, expect, it } from "vitest";
import { buildFirstSteps, detectDevice, nextStep, type FirstStepsProgress } from "./first-steps";

const fresh: FirstStepsProgress = {
  dismissed: false,
  hasMovement: false,
  hasBalance: false,
  hasBudget: false,
};
const desktop = { ios: false, standalone: false };

describe("buildFirstSteps", () => {
  it("starts underway: the account is always done", () => {
    const steps = buildFirstSteps(fresh, desktop);
    expect(steps[0]).toEqual({ id: "account", done: true });
    expect(nextStep(steps)?.id).toBe("movement");
  });

  it("leaves out what doesn't apply instead of ticking it", () => {
    const ids = buildFirstSteps(fresh, desktop).map((s) => s.id);
    expect(ids).toEqual(["account", "movement", "balances", "budget"]);
  });

  it("asks to install only on iOS, and counts the home screen as done", () => {
    expect(buildFirstSteps(fresh, { ios: true, standalone: false }).find((s) => s.id === "install"))
      .toEqual({ id: "install", done: false });
    expect(buildFirstSteps(fresh, { ios: true, standalone: true }).find((s) => s.id === "install"))
      .toEqual({ id: "install", done: true });
  });

  it("has nothing next once everything exists", () => {
    const all = { ...fresh, hasMovement: true, hasBalance: true, hasBudget: true };
    expect(nextStep(buildFirstSteps(all, { ios: true, standalone: true }))).toBeNull();
  });
});

describe("detectDevice", () => {
  const nav = (userAgent: string, maxTouchPoints = 0) => ({ userAgent, maxTouchPoints }) as Navigator;

  it("spots an iPhone and an iPad posing as a Mac", () => {
    expect(detectDevice(nav("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), false).ios).toBe(true);
    expect(detectDevice(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), false).ios).toBe(true);
    expect(detectDevice(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false).ios).toBe(false);
  });

  it("reads standalone from the media query or Safari's flag", () => {
    expect(detectDevice(nav("x"), true).standalone).toBe(true);
    expect(detectDevice({ userAgent: "x", maxTouchPoints: 0, standalone: true } as unknown as Navigator, false).standalone).toBe(true);
  });
});
