import { describe, expect, it } from "vitest";
import { squarify } from "./squarify";

describe("squarify", () => {
  const items = [6, 6, 4, 3, 2, 2, 1];
  const rects = squarify(items, (v) => v, 100, 60);

  it("fills the box exactly, each rect sized by its value", () => {
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);
    expect(area).toBeCloseTo(6000, 6);
    for (const r of rects) expect(r.w * r.h).toBeCloseTo((r.item / 24) * 6000, 6);
  });

  it("stays inside the box", () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(100 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(60 + 1e-9);
    }
  });

  it("drops zeros and handles nothing", () => {
    expect(squarify([0, 0], (v) => v, 10, 10)).toEqual([]);
    expect(squarify([5, 0], (v) => v, 10, 10)).toHaveLength(1);
  });
});
