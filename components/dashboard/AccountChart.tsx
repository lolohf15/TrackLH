"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import type { AccountBalance } from "@/types";

interface Props { data: AccountBalance[]; height?: number }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AccountBalance }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-surface border border-border-strong rounded-xl shadow-card-hover px-4 py-3 text-sm">
      <p className="font-semibold text-text">{item.account}</p>
      <p className="text-text-muted mt-0.5 tabular-nums">{formatMXN(item.currentBalance)}</p>
    </div>
  );
}

export function AccountChart({ data, height = 260 }: Props) {
  const chartData = data.filter((a) => !a.isCredit && a.currentBalance > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState
            title="Sin saldos disponibles"
            description="Configura los saldos iniciales en la sección de cuentas"
          />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="currentBalance"
                nameKey="account"
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: "#a3a3a3", fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
