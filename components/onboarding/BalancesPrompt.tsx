"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { BalancesSheet } from "./BalancesSheet";
import { useT } from "@/lib/i18n-react";
import type { FirstStepsProgress } from "@/lib/first-steps";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/**
 * Sits under the Wallet's total while no account has a balance of its own:
 * a $0 there means "not set yet", not "empty", and this says so with the way
 * to fix it right next to the number.
 */
export function BalancesPrompt() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data } = useSWR<FirstStepsProgress>("/api/onboarding/progress", fetcher);

  if (!data || data.hasBalance) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-t border-border mt-3.5 pt-3">
        <p className="text-[12.5px] text-text-muted leading-snug">{t.balancesSheet.walletPrompt}</p>
        <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
          {t.balancesSheet.walletAction}
        </Button>
      </div>
      <BalancesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
