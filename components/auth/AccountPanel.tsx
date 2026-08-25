"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

/** Who is signed in, and the way out. */
export function AccountPanel() {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    // The service worker caches API responses per device, so a shared phone
    // would hand the next person this session's data. Drop it on the way out.
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="panel px-4 py-3.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          Sesión
        </p>
        <p className="text-[13.5px] text-text truncate mt-1">
          {session?.user?.email ?? "—"}
        </p>
      </div>
      <button
        type="button"
        onClick={leave}
        disabled={busy}
        className="press shrink-0 rounded-full border border-border px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-wide text-text-muted hover:border-border-strong hover:text-text transition-colors duration-150 disabled:opacity-40"
      >
        {busy ? "Saliendo…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
