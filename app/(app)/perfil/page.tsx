"use client";

import Link from "next/link";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { ChevronDownIcon } from "@/components/shell/icons";

export default function Perfil() {
  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pt-4 pb-6 space-y-3">
      <h1 className="text-[15px] font-semibold text-text mb-4">Perfil</h1>

      <ThemeToggle />

      <section>
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
          Administrar
        </p>
        <div className="panel px-4">
          <SettingLink href="/wallet" label="Cuentas" hint="Saldos, límites y ajustes" />
          <SettingLink href="/analytics" label="Categorías" hint="Nombres, colores y presupuestos" />
        </div>
      </section>

      <AccountPanel />
    </div>
  );
}

/** A row that leaves for somewhere else, so the chevron points the way out. */
function SettingLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="press flex items-center justify-between gap-3 py-3.5 border-t border-divider first:border-t-0"
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] text-text">{label}</span>
        <span className="block text-[11.5px] text-text-dim mt-0.5">{hint}</span>
      </span>
      <ChevronDownIcon className="w-4 h-4 text-text-faint shrink-0 -rotate-90" />
    </Link>
  );
}
