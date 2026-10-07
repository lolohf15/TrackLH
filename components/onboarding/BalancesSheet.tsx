"use client";

import { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { InitialBalances } from "@/components/dashboard/InitialBalances";
import { useT } from "@/lib/i18n-react";

/** The Wallet's balance adjuster, reachable from wherever it's asked for. */
export function BalancesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <BottomSheet open={open} onClose={onClose} title={t.balancesSheet.title}>
      <div className="pb-6">
        {/* Mounted only while open, so it reads fresh balances each time. */}
        {open && (
          <InitialBalances
            onSaved={() => mutate((key) => typeof key === "string" && key.startsWith("/api/"))}
          />
        )}
      </div>
    </BottomSheet>
  );
}
