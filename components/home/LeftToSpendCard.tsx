"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCountUp } from "@/lib/useCountUp";
import { formatMXN, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { LeftToSpend } from "@/types";

/**
 * "Te quedan $X · $Y por día": the question people actually open a money app
 * to ask. Expected income less what's gone and the fixed charges still to
 * come, spread over the days left in the month.
 */
export function LeftToSpendCard({ left }: { left: LeftToSpend | null }) {
  const t = useT();
  const router = useRouter();
  const value = useCountUp(Math.abs(left?.left ?? 0), formatMXN);

  if (!left) {
    return (
      <section className="panel px-4 py-3.5">
        <h2 className="text-[15px] font-semibold text-text">{t.overview.leftEmptyTitle}</h2>
        <p className="text-[13px] text-text-muted leading-relaxed mt-1 max-w-[46ch]">{t.overview.leftEmptyHint}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => router.push("/perfil/recurrentes")}>
          {t.overview.leftEmptyAction}
        </Button>
      </section>
    );
  }

  const over = left.left < 0;
  return (
    <section className="panel px-4 pt-3.5 pb-3.5" aria-labelledby="left-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="left-title" className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {t.overview.leftTitle}
        </h2>
        <span className="text-[11.5px] text-text-dim tabular-nums">{t.overview.daysLeft(left.daysLeft)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 mt-1">
        <p className={cn("text-[28px] font-semibold tabular-nums tracking-[-0.025em] leading-tight", over ? "text-red-fg" : "text-text")}>
          {over ? t.overview.overBy(value) : value}
        </p>
        {!over && (
          <p className="text-[14px] font-medium text-text-muted tabular-nums shrink-0">
            {t.overview.perDay(formatMXN(left.perDay))}
          </p>
        )}
      </div>
      <div
        className="mt-2.5 h-[6px] rounded-full bg-surface-2 overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={left.usedPercent}
        aria-label={t.overview.leftTitle}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${left.usedPercent}%`, background: over ? "var(--color-red)" : "var(--color-accent)" }}
        />
      </div>
      <p className="mt-2 text-[11.5px] text-text-dim">
        {t.overview.leftSource[left.source]}
        {left.committed > 0 && ` · ${t.overview.committed(formatMXN(left.committed))}`}
      </p>
    </section>
  );
}
