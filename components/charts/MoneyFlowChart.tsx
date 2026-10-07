"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ChartPanel, PanelNote } from "./ChartPanel";
import { Rich } from "./Rich";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { FlowNode, MoneyFlow } from "@/types";

const W = 300;
const GAP = 6;
const SRC_X = 62;
const NODE_W = 9;
const DST_X = 166;
const MIN_NODE = 2;

/**
 * Where the income went: one band from what came in to each category, and
 * the rest to savings. When spending outran income, a second source shows
 * what came out of the balance. Both sides add up to the same total, so the
 * bands meet without gaps.
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
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const targets = flow.targets;
  const height = Math.max(180, targets.length * 30);
  const usable = height - GAP * (targets.length - 1);
  const k = usable / flow.total;

  const colorOf = (n: FlowNode) =>
    n.key === "saved" ? "var(--color-green)" : n.key === "other" ? "var(--color-text-dim)" : n.color ?? "var(--color-text-dim)";
  const labelOf = (n: FlowNode) =>
    n.key === "saved" ? t.charts.flowSaved : n.key === "other" ? t.charts.flowOther : n.label;

  // Sources stacked on the left with a gap between them, centred on the
  // targets' column.
  const income = flow.sources[0].amount;
  const srcGap = flow.sources.length > 1 ? GAP : 0;
  const srcTop = (height - (flow.total * k + srcGap)) / 2;

  let cum = 0;
  let dstY = 0;
  const bands: Array<{ key: string; d: string; color: string; node: FlowNode }> = [];
  const nodes: Array<{ node: FlowNode; y: number; h: number }> = [];
  for (const node of targets) {
    const h = node.amount * k;
    const a = cum;
    const b = cum + node.amount;
    // A band straddling the two sources is split at their boundary, so it
    // can jump the gap between them.
    const pieces: Array<[number, number]> = a < income && b > income ? [[a, income], [income, b]] : [[a, b]];
    let offset = dstY;
    for (const [p0, p1] of pieces) {
      const ys0 = p0 >= income ? srcTop + p0 * k + srcGap : srcTop + p0 * k;
      const ys1 = ys0 + (p1 - p0) * k;
      const yd0 = offset;
      const yd1 = offset + (p1 - p0) * k;
      const x0 = SRC_X + NODE_W;
      const x1 = DST_X;
      const mx = (x0 + x1) / 2;
      bands.push({
        key: `${node.key}-${p0}`,
        d: `M${x0},${ys0} C${mx},${ys0} ${mx},${yd0} ${x1},${yd0} L${x1},${yd1} C${mx},${yd1} ${mx},${ys1} ${x0},${ys1} Z`,
        color: colorOf(node),
        node,
      });
      offset = yd1;
    }
    nodes.push({ node, y: dstY, h });
    cum = b;
    dstY += h + GAP;
  }

  const open = (node: FlowNode) => {
    if (node.key.startsWith("cat:")) router.push(`/analytics/${encodeURIComponent(node.label)}?${spanQuery}`);
  };

  const saved = targets.find((n) => n.key === "saved");
  const deficit = flow.sources.find((n) => n.key === "deficit");
  const readout = deficit ? (
    <Rich text={t.charts.flowReadDeficit(formatMXN(deficit.amount))} />
  ) : saved ? (
    <Rich text={t.charts.flowReadSaved(Math.round((saved.amount / income) * 100))} />
  ) : null;

  return (
    <ChartPanel
      title={`${periodLabel} · ${t.charts.flow}`}
      aside={<PanelNote>{t.charts.flowIncome(formatMXN(income))}</PanelNote>}
      readout={readout}
    >
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={`${t.charts.flowIncomeNode} → ${targets.map((n) => `${labelOf(n)} ${formatMXN(n.amount)}`).join(", ")}`}>
        <motion.g
          initial={reduceMotion ? false : { clipPath: `inset(0 100% 0 0)` }}
          animate={{ clipPath: `inset(0 0% 0 0)` }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          {bands.map((band) => (
            <path
              key={band.key}
              d={band.d}
              fill={band.color}
              opacity={0.38}
              className={band.node.key.startsWith("cat:") ? "cursor-pointer hover:opacity-60 transition-opacity" : undefined}
              onClick={() => open(band.node)}
            />
          ))}
        </motion.g>

        {flow.sources.map((src, i) => {
          const y = i === 0 ? srcTop : srcTop + income * k + srcGap;
          const h = Math.max(src.amount * k, MIN_NODE);
          const label = src.key === "income" ? t.charts.flowIncomeNode : t.charts.flowDeficitNode;
          return (
            <g key={src.key}>
              <rect x={SRC_X} y={y} width={NODE_W} height={h} rx={3} fill={src.key === "income" ? "var(--color-text)" : "var(--color-red)"} opacity={0.85} />
              <text x={SRC_X - 6} y={y + Math.min(h / 2, 40)} textAnchor="end" fontSize={9.5} fill="var(--color-text-muted)">
                {label}
              </text>
              <text x={SRC_X - 6} y={y + Math.min(h / 2, 40) + 12} textAnchor="end" fontSize={9.5} fontWeight={600} fill="var(--color-text)">
                {formatMXN(src.amount)}
              </text>
            </g>
          );
        })}

        {nodes.map(({ node, y, h }) => (
          <g
            key={node.key}
            className={node.key.startsWith("cat:") ? "cursor-pointer" : undefined}
            onClick={() => open(node)}
          >
            <rect x={DST_X} y={y} width={NODE_W} height={Math.max(h, MIN_NODE)} rx={2} fill={colorOf(node)} />
            <text x={DST_X + NODE_W + 6} y={y + Math.max(h, MIN_NODE) / 2 + 3.5} fontSize={9.5} fill="var(--color-text-muted)">
              {labelOf(node)}{" "}
              <tspan fill="var(--color-text)" fontWeight={600}>
                {formatMXN(node.amount)}
              </tspan>
            </text>
          </g>
        ))}
      </svg>
    </ChartPanel>
  );
}
