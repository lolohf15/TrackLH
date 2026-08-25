"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFiltersPanel } from "@/components/transactions/TransactionFilters";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { getCurrentMonth } from "@/lib/utils";
import type { PaginatedTransactions, TransactionFilters } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildTxUrl(f: TransactionFilters): string {
  const p = new URLSearchParams();
  if (f.month)    p.set("month", f.month);
  if (f.category) p.set("category", f.category);
  if (f.account)  p.set("account", f.account);
  if (f.type)     p.set("type", f.type);
  p.set("page", String(f.page));
  p.set("limit", String(f.limit));
  return `/api/transactions?${p}`;
}

function MovimientosContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") ?? "";

  // Arriving with a different ?category= is a different starting point, so the
  // filters restart from it instead of an effect syncing them after the fact.
  return <MovimientosFilters key={categoryParam} categoryParam={categoryParam} />;
}

function MovimientosFilters({ categoryParam }: { categoryParam: string }) {
  const [filters, setFilters] = useState<TransactionFilters>({
    month: categoryParam ? "" : getCurrentMonth(),
    category: categoryParam, account: "", type: "", page: 1, limit: 50,
  });

  const { data: transactions, isLoading: txLoading } =
    useSWR<PaginatedTransactions>(buildTxUrl(filters), fetcher);

  const { data: filterOptions } =
    useSWR<{ categories: string[]; accounts: string[] }>("/api/transactions/filters", fetcher);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h1 className="text-[15px] font-semibold text-text">Movimientos</h1>
        <TransactionFiltersPanel
          filters={filters}
          categories={filterOptions?.categories ?? []}
          accounts={filterOptions?.accounts ?? []}
          onChange={setFilters}
        />
      </div>

      <div className="panel hidden md:block">
        <TransactionTable
          data={transactions ?? null}
          loading={txLoading}
          page={filters.page}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      </div>
      <div className="panel px-4 pb-2 md:hidden">
        <TransactionList
          data={transactions ?? null}
          loading={txLoading}
          page={filters.page}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      </div>
    </div>
  );
}

export default function Movimientos() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6"><ChartSkeleton height="h-96" /></div>}>
      <MovimientosContent />
    </Suspense>
  );
}
