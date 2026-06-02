"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import type { AccountBalance } from "@/types";

interface Props { data: AccountBalance[] }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AccountBalance }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-card-hover px-4 py-3 text-sm">
      <p className="font-semibold text-[#e6edf3]">{item.account}</p>
      <p className="text-[#c9d1d9] mt-0.5 tabular-nums">{formatMXN(item.currentBalance)}</p>
    </div>
  );
}

export function AccountChart({ data }: Props) {
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
            description="Configura los saldos iniciales en la sección de ajustes"
          />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
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
                  <Cell key={i} fill={entry.color} opacity={0.88} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: "#c9d1d9", fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
