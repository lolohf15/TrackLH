/**
 * Squarified treemap (Bruls, Huizing & van Wijk): lays values out as
 * rectangles filling a box, each sized by its value, keeping them as close to
 * square as it can so the small ones stay legible.
 */
export interface TreeRect<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function squarify<T>(items: T[], value: (item: T) => number, width: number, height: number): TreeRect<T>[] {
  const sorted = items.filter((i) => value(i) > 0).sort((a, b) => value(b) - value(a));
  const total = sorted.reduce((s, i) => s + value(i), 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];

  const scale = (width * height) / total;
  const out: TreeRect<T>[] = [];
  let x = 0, y = 0, w = width, h = height;
  let rest = sorted;

  const worst = (row: T[], side: number) => {
    const sum = row.reduce((s, i) => s + value(i) * scale, 0);
    const len = sum / side;
    return Math.max(...row.map((i) => {
      const a = value(i) * scale;
      return Math.max((len * len) / a, a / (len * len));
    }));
  };

  while (rest.length) {
    const horizontal = w >= h;
    const side = horizontal ? h : w;
    let row: T[] = [rest[0]];
    let best = worst(row, side);
    for (let i = 1; i < rest.length; i++) {
      const next = worst([...row, rest[i]], side);
      if (next > best) break;
      row = [...row, rest[i]];
      best = next;
    }

    const len = row.reduce((s, i) => s + value(i) * scale, 0) / side;
    let offset = 0;
    for (const item of row) {
      const l = (value(item) * scale) / len;
      out.push(horizontal ? { item, x, y: y + offset, w: len, h: l } : { item, x: x + offset, y, w: l, h: len });
      offset += l;
    }
    if (horizontal) { x += len; w -= len; } else { y += len; h -= len; }
    rest = rest.slice(row.length);
  }
  return out;
}
