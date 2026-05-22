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
  default: { value: "text-[#111827]",   icon: "text-[#6B7280] bg-[#F8F5F0]" },
  green:   { value: "text-[#16A34A]",   icon: "text-[#16A34A] bg-green-50" },
  red:     { value: "text-[#C0392B]",   icon: "text-[#C0392B] bg-red-50" },
  gold:    { value: "text-[#C6A15B]",   icon: "text-[#C6A15B] bg-amber-50" },
  amber:   { value: "text-[#D97706]",   icon: "text-[#D97706] bg-amber-50" },
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
        <div className={cn("text-2xl font-serif-display font-semibold tracking-tight tabular-nums", style.value)}>
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {subtitle && (
            <p className="text-xs text-[#6B7280]">{subtitle}</p>
          )}
          {showTrend && trend !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              trendGood ? "text-[#16A34A]" : trendBad ? "text-[#C0392B]" : "text-[#6B7280]"
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
