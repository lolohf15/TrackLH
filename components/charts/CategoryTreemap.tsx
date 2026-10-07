"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChartPanel, PanelFigure } from "./ChartPanel";
import { Rich } from "./Rich";
import { squarify } from "@/services/squarify";
import { inkOn } from "@/lib/color";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { CategorySummary } from "@/types";

/** The box the layout is computed in; drawn as percentages of it. */
const W = 100;
const H = 80;

/**
 * Where the money went, as blocks: each category's area is its share of the
 * spending, so the big ones are obvious before any number is read. A block
 * opens its category.
 */
export function CategoryTreemap({
  categories,
  periodLabel,
  total,
  spanQuery,
  note,
}: {
  categories: CategorySummary[];
  periodLabel: string;
  total: number;
  /** Carried to the category screen so it opens on the same span. */
  spanQuery: string;
  /** A sentence about the categories (an insight), shown before the hint. */
  note?: string | null;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const rects = squarify(categories, (c) => c.amount, W, H);

  return (
    <ChartPanel
      title={`${periodLabel} · ${t.charts.categories}`}
      aside={<PanelFigure>{formatMXN(total)}</PanelFigure>}
      readout={note ? <Rich text={`${note} · ${t.charts.treemapHint}`} /> : t.charts.treemapHint}
    >
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        {rects.map(({ item, x, y, w, h }, i) => {
          const ink = inkOn(item.color);
          // Labels only where they fit: a name needs width, a figure height.
          const roomy = w * h > 300 && w > 16;
          const small = !roomy && w * h > 110 && w > 11;
          return (
            <motion.div
              key={item.category}
              className="absolute p-[1.5px]"
              style={{ left: `${x}%`, top: `${(y / H) * 100}%`, width: `${w}%`, height: `${(h / H) * 100}%` }}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1], delay: Math.min(i * 0.04, 0.3) }}
            >
              <Link
                href={`/analytics/${encodeURIComponent(item.category)}?${spanQuery}`}
                aria-label={`${item.category}: ${formatMXN(item.amount)}, ${Math.round(item.percentage)}%`}
                className="press flex h-full w-full flex-col justify-start overflow-hidden rounded-[8px] p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-text"
                style={{ background: item.color, color: ink }}
              >
                {roomy && (
                  <>
                    <span className="text-[13px] font-semibold leading-tight tabular-nums">
                      {Math.round(item.percentage)}%
                    </span>
                    <span className="text-[11px] leading-tight truncate opacity-90">{item.category}</span>
                    {h > 22 && (
                      <span className="mt-auto text-[11px] leading-tight tabular-nums opacity-80">
                        {formatMXN(item.amount)}
                      </span>
                    )}
                  </>
                )}
                {small && <span className="text-[11px] font-semibold leading-tight tabular-nums">{Math.round(item.percentage)}%</span>}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </ChartPanel>
  );
}
