"use client";

import { useState } from "react";
import useSWR from "swr";
import { mutate } from "swr";
import { AccountChart } from "@/components/dashboard/AccountChart";
import { AccountBalances } from "@/components/dashboard/AccountBalances";
import { InitialBalances } from "@/components/dashboard/InitialBalances";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ChevronDownIcon } from "@/components/shell/icons";
import { getCurrentMonth } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Cuentas() {
  const { data: dashboard, isLoading } =
    useSWR<DashboardData>(`/api/dashboard?month=${getCurrentMonth()}`, fetcher);
  const [balancesOpen, setBalancesOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6 space-y-4">
      <h1 className="text-lg font-semibold text-text">Cuentas</h1>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {isLoading ? (
          <><ChartSkeleton height="h-80" /><ChartSkeleton height="h-80" /></>
        ) : (
          <>
            <AccountChart data={(dashboard?.accountBalances ?? []).filter((a) => !a.isCredit)} height={280} />
            <Card>
              <CardHeader><CardTitle>Saldo por cuenta</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <AccountBalances data={dashboard?.accountBalances ?? []} bare />
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <Card>
        <button
          type="button"
          onClick={() => setBalancesOpen((v) => !v)}
          aria-expanded={balancesOpen}
          className="press w-full flex items-center justify-between gap-3 px-5 pt-5 pb-2 sm:px-6 sm:pt-6 text-left"
        >
          <CardTitle>Ajuste de saldos actuales</CardTitle>
          <ChevronDownIcon
            className={cn(
              "w-4 h-4 text-text-dim shrink-0 transition-transform duration-200 ease-out",
              balancesOpen && "rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "overflow-hidden transition-[max-height] duration-300 ease-out",
            balancesOpen ? "max-h-[3000px]" : "max-h-0"
          )}
        >
          <CardContent className="pt-0">
            <InitialBalances onSaved={() => mutate(() => true)} />
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
