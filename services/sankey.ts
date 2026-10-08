/**
 * Lays out a left-to-right flow diagram: nodes in columns, each as tall as
 * its value, and bands between them as thick as the money they carry. A node
 * too small to hold its label still gets a label-sized slot, so labels never
 * pile up; its bar stays true to its value inside that slot.
 */
export interface SankeyNode {
  id: string;
  column: number;
  value: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface PlacedNode {
  id: string;
  x: number;
  /** Top of the bar. */
  y: number;
  h: number;
  /** Vertical centre of the node's slot, where its label sits. */
  cy: number;
}

export interface PlacedLink extends SankeyLink {
  x0: number;
  x1: number;
  /** Top of the band where it leaves its source, and where it reaches its target. */
  y0: number;
  y1: number;
  /** Thickness. */
  w: number;
}

export interface SankeyLayout {
  nodes: Map<string, PlacedNode>;
  links: PlacedLink[];
  height: number;
}

export function layoutSankey(
  nodes: SankeyNode[],
  links: SankeyLink[],
  opts: {
    /** x of each column's bar, by column index. */
    columnX: number[];
    nodeWidth: number;
    /** Pixels the largest column's values add up to. */
    scaleHeight: number;
    gap: number;
    /** The least vertical room a node takes, for its label. */
    minSlot: number;
  }
): SankeyLayout {
  const columns = new Map<number, SankeyNode[]>();
  for (const n of nodes) columns.set(n.column, [...(columns.get(n.column) ?? []), n]);

  const maxTotal = Math.max(1, ...Array.from(columns.values(), (col) => col.reduce((s, n) => s + n.value, 0)));
  const k = opts.scaleHeight / maxTotal;

  const slotOf = (n: SankeyNode) => Math.max(n.value * k, opts.minSlot);
  const stackHeight = (col: SankeyNode[]) => col.reduce((s, n) => s + slotOf(n), 0) + opts.gap * (col.length - 1);
  const height = Math.max(...Array.from(columns.values(), stackHeight));

  const placed = new Map<string, PlacedNode>();
  for (const [column, col] of columns) {
    let y = (height - stackHeight(col)) / 2;
    for (const n of col) {
      const slot = slotOf(n);
      const h = n.value * k;
      placed.set(n.id, { id: n.id, x: opts.columnX[column], y: y + (slot - h) / 2, h, cy: y + slot / 2 });
      y += slot + opts.gap;
    }
  }

  // Bands leave and arrive in the order of the nodes at their other end, so
  // they never cross on their way in or out of a bar.
  const out = new Map<string, number>();
  const into = new Map<string, number>();
  const byTarget = [...links].sort((a, b) => placed.get(a.target)!.y - placed.get(b.target)!.y);
  const sourceOffset = new Map<SankeyLink, number>();
  for (const l of byTarget) {
    const used = out.get(l.source) ?? 0;
    sourceOffset.set(l, used);
    out.set(l.source, used + l.value * k);
  }
  const bySource = [...links].sort((a, b) => placed.get(a.source)!.y - placed.get(b.source)!.y);
  const placedLinks: PlacedLink[] = bySource.map((l) => {
    const s = placed.get(l.source)!;
    const t = placed.get(l.target)!;
    const usedIn = into.get(l.target) ?? 0;
    into.set(l.target, usedIn + l.value * k);
    return {
      ...l,
      x0: s.x + opts.nodeWidth,
      x1: t.x,
      y0: s.y + sourceOffset.get(l)!,
      y1: t.y + usedIn,
      w: l.value * k,
    };
  });

  return { nodes: placed, links: placedLinks, height };
}

/** The band as a filled ribbon with eased ends. */
export function ribbonPath({ x0, x1, y0, y1, w }: PlacedLink): string {
  const mx = (x0 + x1) / 2;
  return `M${x0},${y0}C${mx},${y0} ${mx},${y1} ${x1},${y1}L${x1},${y1 + w}C${mx},${y1 + w} ${mx},${y0 + w} ${x0},${y0 + w}Z`;
}
