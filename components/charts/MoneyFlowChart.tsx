"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChartPanel, PanelNote } from "./ChartPanel";
import { Rich } from "./Rich";
import { layoutSankey, ribbonPath, type SankeyLink, type SankeyNode } from "@/services/sankey";
import { formatMXN, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { MoneyFlow } from "@/types";

const NODE_W = 8;
const GAP = 6;
const MIN_SLOT = 34;
const LABEL_GAP = 6;

interface Node extends SankeyNode {
  label: string;
  color: string;
  /** Expense categories open their breakdown when tapped. */
  category?: string;
}

/** The chart's own width in pixels, so labels are drawn at their real size. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Where the period's money came from and went: income sources into the
 * month's income, out to each category and to savings, and one category
 * opened up into what it was spent on. Tapping a category opens it there.
 * Before any income, the flow starts from what's been spent.
 */
export function MoneyFlowChart({
  flow,
  periodLabel,
  spanQuery,
}: {
  flow: MoneyFlow;
  periodLabel: string;
  spanQuery: string;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [ref, width] = useWidth<HTMLDivElement>();

  // Opens on the biggest category that has more than one thing in it.
  const firstOpen =
    flow.categories.find((c) => c.label && (flow.details[c.label]?.length ?? 0) >= 2)?.label ?? null;
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const open = picked === undefined ? firstOpen : picked;
  const details = open ? flow.details[open] ?? [] : [];

  // ---- the graph -------------------------------------------------------
  const wide = width >= 480;
  const withSources = wide && flow.sources.length >= 2;
  const withDetails = details.length > 0;
  const colSources = 0;
  const colMid = withSources ? 1 : 0;
  const colCats = colMid + 1;
  const colDetails = colCats + 1;
  const columnCount = colCats + 1 + (withDetails ? 1 : 0);

  const otherLabel = t.charts.flowOther;
  const nodes: Node[] = [];
  const links: SankeyLink[] = [];

  if (withSources) {
    for (const s of flow.sources) {
      nodes.push({ id: `src:${s.label}`, column: colSources, value: s.amount, label: s.label, color: s.color ?? "var(--color-green)" });
      links.push({ source: `src:${s.label}`, target: "income", value: s.amount });
    }
  }
  if (flow.income > 0) {
    nodes.push({ id: "income", column: colMid, value: flow.income, label: t.charts.flowIncomeNode, color: "var(--color-text)" });
    if (flow.deficit > 0) {
      nodes.push({ id: "deficit", column: colMid, value: flow.deficit, label: t.charts.flowDeficitNode, color: "var(--color-red)" });
    }
  } else {
    nodes.push({ id: "spent", column: colMid, value: flow.expenses, label: t.charts.flowSpentNode, color: "var(--color-text)" });
  }

  // Income fills the categories from the top; what it doesn't reach came
  // out of the balance.
  let incomeLeft = flow.income;
  for (const c of flow.categories) {
    const id = `cat:${c.label}`;
    nodes.push({
      id,
      column: colCats,
      value: c.amount,
      label: c.label || otherLabel,
      color: c.color ?? "var(--color-text-dim)",
      category: c.label || undefined,
    });
    if (flow.income <= 0) {
      links.push({ source: "spent", target: id, value: c.amount });
      continue;
    }
    const fromIncome = Math.min(incomeLeft, c.amount);
    incomeLeft -= fromIncome;
    if (fromIncome > 0) links.push({ source: "income", target: id, value: fromIncome });
    if (c.amount - fromIncome > 0.005) links.push({ source: "deficit", target: id, value: c.amount - fromIncome });
  }
  if (flow.saved > 0) {
    nodes.push({ id: "saved", column: colCats, value: flow.saved, label: t.charts.flowSaved, color: "var(--color-green)" });
    links.push({ source: "income", target: "saved", value: flow.saved });
  }
  if (withDetails && open) {
    const color = flow.categories.find((c) => c.label === open)?.color ?? "var(--color-text-dim)";
    for (const d of details) {
      const id = `det:${d.label}`;
      nodes.push({ id, column: colDetails, value: d.amount, label: d.label || otherLabel, color });
      links.push({ source: `cat:${open}`, target: id, value: d.amount });
    }
  }

  // Labels sit left of their bar, so the first column gets a gutter for its
  // own and the rest share what's left evenly.
  const gutter = Math.min(110, Math.max(76, width * 0.24));
  const span = Math.max(0, width - NODE_W - gutter);
  const columnX = Array.from({ length: columnCount }, (_, i) =>
    columnCount === 1 ? gutter : gutter + (span * i) / (columnCount - 1)
  );
  const labelRoom = columnCount > 1 ? span / (columnCount - 1) - LABEL_GAP * 2 : gutter;

  const layout = width > 0
    ? layoutSankey(nodes, links, { columnX, nodeWidth: NODE_W, scaleHeight: wide ? 260 : 230, gap: GAP, minSlot: MIN_SLOT })
    : null;

  const colorOf = (id: string) => nodes.find((n) => n.id === id)?.color ?? "var(--color-text-dim)";

  const toggle = (category?: string) => {
    if (!category || !(flow.details[category]?.length)) return;
    setPicked(open === category ? null : category);
  };

  // ---- the readout -----------------------------------------------------
  let readout: React.ReactNode;
  if (open && withDetails) {
    const total = flow.categories.find((c) => c.label === open)?.amount ?? 0;
    readout = (
      <>
        <Rich
          text={`**${open} ${formatMXN(total)}** · ${details
            .slice(0, 3)
            .map((d) => `${d.label || otherLabel} ${formatMXN(d.amount)}`)
            .join(" · ")}`}
        />{" "}
        <Link
          href={`/analytics/${encodeURIComponent(open)}?${spanQuery}`}
          className="font-medium text-accent hover:brightness-125 whitespace-nowrap"
        >
          {t.charts.flowOpenCategory} →
        </Link>
      </>
    );
  } else if (flow.deficit > 0) {
    readout = <Rich text={t.charts.flowReadDeficit(formatMXN(flow.deficit))} />;
  } else if (flow.saved > 0) {
    readout = <Rich text={t.charts.flowReadSaved(Math.round((flow.saved / flow.income) * 100))} />;
  } else {
    readout = t.charts.flowTapCategory;
  }

  return (
    <ChartPanel
      title={`${periodLabel} · ${t.charts.flow}`}
      aside={<PanelNote>{flow.income > 0 ? t.charts.flowIncome(formatMXN(flow.income)) : t.charts.flowNoIncome}</PanelNote>}
      readout={readout}
    >
      <div ref={ref} className="relative w-full" style={{ height: layout?.height ?? 230 }}>
        {layout && (
          // A new shape (another category opened, another period) fades in
          // whole rather than sliding each band: cheaper, and nothing can be
          // left halfway.
          <motion.div
            key={`${open ?? ""}|${columnCount}|${flow.income}|${flow.expenses}`}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <svg
              width={width}
              height={layout.height}
              viewBox={`0 0 ${width} ${layout.height}`}
              className="absolute inset-0 overflow-visible"
              role="img"
              aria-label={nodes
                .filter((n) => n.column === colCats)
                .map((n) => `${n.label} ${formatMXN(n.value)}`)
                .join(", ")}
            >
              {layout.links.map((l) => {
                const lit = !open || l.source === `cat:${open}` || l.target === `cat:${open}`;
                const target = nodes.find((n) => n.id === l.target);
                // A source band carries its source's colour; everything
                // after the month's income carries where it went.
                const color = l.source.startsWith("src:") ? colorOf(l.source) : colorOf(l.target);
                return (
                  <path
                    key={`${l.source}>${l.target}`}
                    d={ribbonPath(l)}
                    fill={color}
                    opacity={lit ? 0.5 : 0.22}
                    className={cn("transition-opacity duration-200", target?.category && "cursor-pointer")}
                    onClick={() => toggle(target?.category)}
                  />
                );
              })}
              {nodes.map((n) => {
                const p = layout.nodes.get(n.id)!;
                return (
                  <rect
                    key={n.id}
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={Math.max(p.h, 2)}
                    rx={2.5}
                    fill={n.color}
                    className={cn(n.category && "cursor-pointer")}
                    onClick={() => toggle(n.category)}
                  />
                );
              })}
            </svg>

            {/* Labels in HTML, so they wrap a pill around real text. */}
            {nodes.map((n) => {
              const p = layout.nodes.get(n.id)!;
              const room = n.column === 0 ? gutter - LABEL_GAP : labelRoom;
              const isOpen = n.category !== undefined && n.category === open;
              const interactive = !!n.category && (flow.details[n.category]?.length ?? 0) > 0;
              const Tag = interactive ? "button" : "div";
              return (
                <Tag
                  key={n.id}
                  type={interactive ? "button" : undefined}
                  onClick={interactive ? () => toggle(n.category) : undefined}
                  aria-expanded={interactive ? isOpen : undefined}
                  className={cn(
                    "absolute -translate-x-full -translate-y-1/2 flex flex-col items-end gap-[3px] rounded-[6px] px-1.5 py-[4px] text-right leading-none whitespace-nowrap",
                    // Solid enough to read over the bands without a backdrop filter per
                    // label, which the phone would composite on every frame.
                    "bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)]",
                    interactive && "press outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isOpen && "ring-1 ring-[color-mix(in_srgb,var(--color-text)_35%,transparent)]"
                  )}
                  style={{ left: p.x - LABEL_GAP, top: p.cy, maxWidth: Math.max(56, room) }}
                >
                  <span className="max-w-full truncate text-[10.5px] text-text-muted">{n.label}</span>
                  <span className="text-[11.5px] font-semibold text-text tabular-nums">{formatMXN(n.value)}</span>
                </Tag>
              );
            })}
          </motion.div>
        )}
      </div>
    </ChartPanel>
  );
}
