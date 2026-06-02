"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "default" | "green" | "red" | "gold" | "amber";
  /** Percent change vs previous period. Positive = up, negative = down. */
  trend?: number | null;
  /** Whether a higher trend is good (true) or bad (false). Defaults to true. */
  trendPositiveIsGood?: boolean;
  className?: string;
}

const accents: Record<string, { value: string; icon: string }> = {
  default: { value: "text-[#e6edf3]",   icon: "text-[#8b949e] bg-[#21262d]" },
  green:   { value: "text-[#3fb950]",   icon: "text-[#3fb950] bg-green-900/20" },
  red:     { value: "text-[#f85149]",   icon: "text-[#f85149] bg-red-900/20" },
  gold:    { value: "text-[#d29922]",   icon: "text-[#d29922] bg-amber-900/20" },
  amber:   { value: "text-[#d29922]",   icon: "text-[#d29922] bg-amber-900/20" },
};

export function StatCard({
  title, value, subtitle, icon, accent = "default",
  trend, trendPositiveIsGood = true, className,
}: StatCardProps) {
  const style = accents[accent] ?? accents.default;

  const showTrend = trend != null && isFinite(trend);
  const trendUp   = trend != null && trend > 0;
  const trendDown = trend != null && trend < 0;
  const trendGood = trendPositiveIsGood ? trendUp : trendDown;
  const trendBad  = trendPositiveIsGood ? trendDown : trendUp;

  return (
    <Card className={cn("hover:shadow-card-hover", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>{title}</CardTitle>
        {icon && (
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", style.icon)}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-semibold tracking-tight tabular-nums", style.value)}>
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {subtitle && (
            <p className="text-xs text-[#8b949e]">{subtitle}</p>
          )}
          {showTrend && trend !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              trendGood ? "text-[#3fb950]" : trendBad ? "text-[#f85149]" : "text-[#8b949e]"
            )}>
              {trendUp ? "▲" : "▼"}
              {Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
