"use client";

import { useState } from "react";
import { formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { AnalyticsData } from "@/types";

/**
 * Every figure the charts above draw, as two plain tables: categories, then
 * each day (or month). One for the whole screen, the charts' accessible twin,
 * folded away until asked for.
 */
export function AnalyticsTable({ data }: { data: AnalyticsData }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const label = (key: string) =>
    new Intl.DateTimeFormat(
      locale,
      key.length === 7 ? { month: "long", year: "numeric", timeZone: "UTC" } : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }
    ).format(new Date(key.length === 7 ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press mx-auto flex min-h-[44px] items-center px-3 font-mono text-[10.5px] font-medium uppercase tracking-wide text-text-dim hover:text-text"
      >
        {open ? t.charts.tableHide : t.charts.tableAll}
      </button>
      {open && (
        <div className="panel px-4 py-3 overflow-x-auto flex flex-col gap-5">
          <Table
            headers={[t.common.category, t.charts.tableTotal, t.charts.tableShare]}
            rows={data.categories.map((c) => [c.category, formatMXN(c.amount), `${Math.round(c.percentage)}%`])}
          />
          <Table
            headers={[t.charts.tableDay, t.charts.tableTotal, t.charts.tableTop]}
            rows={data.buckets
              .filter((b) => b.expenses > 0)
              .map((b) => [label(b.key), formatMXN(b.expenses), b.slices[0]?.category ?? ""])}
          />
        </div>
      )}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-[12px] tabular-nums">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={h}
              scope="col"
              className={`font-mono text-[9.5px] font-semibold text-text-dim uppercase tracking-wide py-1.5 pr-3 whitespace-nowrap ${i === 1 ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-t border-divider">
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row" className="text-left font-normal text-text-muted py-1.5 pr-3 whitespace-nowrap">
                  {cell}
                </th>
              ) : (
                <td key={i} className={`py-1.5 pr-3 whitespace-nowrap text-text ${i === 1 ? "text-right" : "text-left"}`}>
                  {cell}
                </td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
