"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SyncResult } from "@/types";

interface SyncButtonProps {
  lastSyncAt: string | null;
  onSyncComplete: () => void;
  compact?: boolean;
}

export function SyncButton({ lastSyncAt, onSyncComplete, compact = false }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setShowWarnings(false);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data: SyncResult = await res.json();
      setResult(data);
      if (data.success) onSyncComplete();
    } catch {
      setResult({
        success: false, count: 0, skipped: 0, warnings: [],
        message: "Error de red",
        syncedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        {result && !compact && (
          <span className={cn("text-xs font-medium animate-fade-in", result.success ? "text-green-fg" : "text-red-fg")}>
            {result.success ? `✓ ${result.message}` : `✗ ${result.message}`}
          </span>
        )}
        {!result && lastSyncAt && !compact && (
          <span className="text-xs text-text-dim">
            Sync: {formatRelativeTime(lastSyncAt)}
          </span>
        )}
        <Button onClick={handleSync} loading={loading} variant="secondary" size="sm">
          <svg
            className={cn("w-3.5 h-3.5 shrink-0 transition-transform", loading && "animate-spin-fast")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {!compact && "Sincronizar"}
        </Button>
      </div>

      {result?.warnings && result.warnings.length > 0 && (
        <div className="text-right">
          <button
            onClick={() => setShowWarnings((v) => !v)}
            className="text-xs text-amber-fg underline underline-offset-2 hover:text-[#FCD34D] transition-colors"
          >
            {result.warnings.length} advertencia{result.warnings.length > 1 ? "s" : ""}
          </button>
          {showWarnings && (
            <ul className="mt-1.5 text-xs text-text-dim space-y-0.5 max-w-xs text-right">
              {result.warnings.map((w, i) => (
                <li key={i} className="truncate">⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
