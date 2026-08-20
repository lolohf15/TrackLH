"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CategoryTrend } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CategoryDetailPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const decoded = decodeURIComponent(category);

  const { data, isLoading } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  const trend = data?.trends.find((t) => t.category === decoded) ?? null;

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
      <Link href="/categorias" className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-text-dim hover:text-text transition-colors mb-4">
        ‹ CATEGORÍAS
      </Link>

      {isLoading ? (
        <ChartSkeleton height="h-80" />
      ) : trend ? (
        <CategoryDetail trend={trend} />
      ) : (
        <EmptyState title="Categoría no encontrada" />
      )}
    </div>
  );
}
