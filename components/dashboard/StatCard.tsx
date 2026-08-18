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
  style?: React.CSSProperties;
  large?: boolean;
}

const accents: Record<string, { value: string; icon: string }> = {
  default: { value: "text-text",     icon: "text-text-dim bg-surface-2" },
  green:   { value: "text-green-fg", icon: "text-green-fg bg-green-bg" },
  red:     { value: "text-red-fg",   icon: "text-red-fg bg-red-bg" },
  gold:    { value: "text-amber-fg", icon: "text-amber-fg bg-amber-bg" },
  amber:   { value: "text-amber-fg", icon: "text-amber-fg bg-amber-bg" },
};

export function StatCard({
  title, value, subtitle, icon, accent = "default",
  trend, trendPositiveIsGood = true, className, style, large = false,
}: StatCardProps) {
  const style_ = accents[accent] ?? accents.default;

  const showTrend = trend != null && isFinite(trend);
  const trendUp   = trend != null && trend > 0;
  const trendDown = trend != null && trend < 0;
  const trendGood = trendPositiveIsGood ? trendUp : trendDown;
  const trendBad  = trendPositiveIsGood ? trendDown : trendUp;

  return (
    <Card className={cn("animate-fade-in-up", className)} >
      <div style={style}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>{title}</CardTitle>
          {icon && (
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", style_.icon)}>
              {icon}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "font-semibold tracking-tight tabular-nums",
            large ? "text-3xl sm:text-4xl" : "text-2xl",
            style_.value
          )}>
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {subtitle && (
              <p className="text-xs text-text-dim">{subtitle}</p>
            )}
            {showTrend && trend !== 0 && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                trendGood ? "text-green-fg" : trendBad ? "text-red-fg" : "text-text-dim"
              )}>
                {trendUp ? "▲" : "▼"}
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
