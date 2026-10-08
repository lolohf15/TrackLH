"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { SettingsGroup, SettingsRow, SubpageHeader } from "@/components/settings/SettingsList";
import { CategoryEditSheet, type EditableCategory } from "@/components/settings/CategoryEditSheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Expense and income categories, each opening its edit sheet; budgets show on the right. */
export default function CategoriesPage() {
  const t = useT();
  const { data: categories } = useSWR<EditableCategory[]>("/api/categories", fetcher);
  const [editing, setEditing] = useState<EditableCategory | "new" | null>(null);

  const groups = [
    { title: t.profile.expenseCategories, items: (categories ?? []).filter((c) => c.kind === "expense") },
    { title: t.profile.incomeCategories, items: (categories ?? []).filter((c) => c.kind === "income") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pb-8 flex flex-col gap-7">
      <SubpageHeader title={t.profile.categories} backLabel={t.profile.back} />
      {!categories ? (
        <ChartSkeleton height="h-48" />
      ) : (
        groups.map((g) => (
          <SettingsGroup key={g.title} title={g.title}>
            {g.items.map((c) => (
              <SettingsRow
                key={c.id}
                leading={<CategoryIcon icon={c.icon} name={c.name} color={c.color} size="sm" />}
                label={c.name}
                value={c.kind === "expense" && c.budget > 0 ? formatMXN(c.budget) : undefined}
                onClick={() => setEditing(c)}
              />
            ))}
          </SettingsGroup>
        ))
      )}
      <SettingsGroup footer={t.profile.categoriesHint}>
        <SettingsRow icon={Plus} tile="accent" tone="action" label={t.analytics.addCategory} onClick={() => setEditing("new")} />
      </SettingsGroup>
      <CategoryEditSheet
        key={editing === "new" ? "new" : `category-${editing?.id ?? "none"}`}
        category={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
