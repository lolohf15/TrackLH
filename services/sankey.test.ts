import { describe, expect, it } from "vitest";
import { layoutSankey } from "./sankey";

const opts = { columnX: [0, 100, 200], nodeWidth: 8, scaleHeight: 100, gap: 4, minSlot: 10 };

describe("layoutSankey", () => {
  const nodes = [
    { id: "in", column: 0, value: 100 },
    { id: "a", column: 1, value: 60 },
    { id: "b", column: 1, value: 39 },
    { id: "c", column: 1, value: 1 },
  ];
  const links = [
    { source: "in", target: "a", value: 60 },
    { source: "in", target: "b", value: 39 },
    { source: "in", target: "c", value: 1 },
  ];
  const l = layoutSankey(nodes, links, opts);

  it("sizes bars by value and gives tiny ones a label-sized slot", () => {
    expect(l.nodes.get("a")!.h).toBeCloseTo(60);
    expect(l.nodes.get("c")!.h).toBeCloseTo(1);
    // 60 + 39 + 10 (slot) + 2 gaps
    expect(l.height).toBeCloseTo(117);
  });

  it("stacks bands on the source in target order, without gaps", () => {
    const [a, b, c] = ["a", "b", "c"].map((id) => l.links.find((x) => x.target === id)!);
    expect(a.y0).toBeCloseTo(l.nodes.get("in")!.y);
    expect(b.y0).toBeCloseTo(a.y0 + a.w);
    expect(c.y0).toBeCloseTo(b.y0 + b.w);
    expect(a.y1).toBeCloseTo(l.nodes.get("a")!.y);
  });

  it("joins at the bars' edges", () => {
    const a = l.links[0];
    expect(a.x0).toBe(8);
    expect(a.x1).toBe(100);
  });
});
