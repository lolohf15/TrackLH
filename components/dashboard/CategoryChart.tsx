"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import type { CategorySummary } from "@/types";

interface Props { data: CategorySummary[] }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategorySummary }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-card-hover px-4 py-3 text-sm">
      <p className="font-semibold text-[#e6edf3]">{item.category}</p>
      <p className="text-[#c9d1d9] mt-0.5 tabular-nums">{formatMXN(item.amount)}</p>
      <p className="text-[#8b949e] text-xs mt-0.5">{item.percentage}% del total · {item.count} movs.</p>
    </div>
  );
}

export function CategoryChart({ data }: Props) {
  const top = data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <EmptyState
            title="Sin gastos este mes"
            description="Sincroniza tus transacciones para ver el análisis por categoría"
          />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, top.length * 36)}>
            <BarChart data={top} layout="vertical" margin={{ left: 4, right: 28, top: 4, bottom: 4 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "#8b949e" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={112}
                tick={{ fontSize: 12, fill: "#c9d1d9" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {top.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
