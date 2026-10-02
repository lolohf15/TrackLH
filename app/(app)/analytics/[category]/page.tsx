"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CategoryTrend } from "@/types";
import { useT } from "@/lib/i18n-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ period?: string; anchor?: string }>;
}) {
  const t = useT();
  const { category } = use(params);
  // Carried over from Analytics so "see movements" keeps the span it was on.
  const { period, anchor } = use(searchParams);
  const spanQuery = period
    ? new URLSearchParams(anchor ? { period, anchor } : { period }).toString()
    : undefined;
  const decoded = decodeURIComponent(category);

  const { data, isLoading } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  const trend = data?.trends.find((t) => t.category === decoded) ?? null;

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
      <Link href="/analytics" className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-text-dim hover:text-text transition-colors mb-4">
        ‹ {t.analytics.title.toUpperCase()}
      </Link>

      {isLoading ? (
        <ChartSkeleton height="h-80" />
      ) : trend ? (
        <div className="panel px-4 py-5">
          <CategoryDetail trend={trend} spanQuery={spanQuery} />
        </div>
      ) : (
        <div className="panel">
          <EmptyState title={t.analytics.categoryNotFound} />
        </div>
      )}
    </div>
  );
}
