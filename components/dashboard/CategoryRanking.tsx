import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryRow } from "@/components/dashboard/CategoryRow";
import type { CategorySummary } from "@/types";
import { useT } from "@/lib/i18n-react";

interface Props { data: CategorySummary[]; limit?: number }

/** The period's categories, biggest first, in the same row Analytics uses. */
export function CategoryRanking({ data, limit = 10 }: Props) {
  const t = useT();
  const top = data.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.analytics.spendByCategory}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {top.length === 0 ? (
          <EmptyState
            title={t.analytics.noSpendTitle}
            description={t.analytics.noSpendHint}
          />
        ) : (
          <div className="flex flex-col">
            {top.map((c) => (
              <CategoryRow
                key={c.category}
                category={c}
                href={`/analytics/${encodeURIComponent(c.category)}`}
                className="first:border-t-0"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
