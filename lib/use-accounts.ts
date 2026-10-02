"use client";

import { useState } from "react";
import useSWR from "swr";
import { dayKey, todayAnchor } from "@/services/period";
import type { AccountConfigView } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/**
 * The account configs with each card's statement, computed against today on
 * the reader's clock. Captured once per mount: a screen left open across
 * midnight is not worth reading the clock on every render.
 */
export function useAccounts() {
  const [key] = useState(() => `/api/accounts?today=${dayKey(todayAnchor())}`);
  return useSWR<AccountConfigView[]>(key, fetcher);
}
