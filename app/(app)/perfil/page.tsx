"use client";

import { useState } from "react";
import useSWR from "swr";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { LanguageToggle } from "@/components/settings/LanguageToggle";
import { DataPanel } from "@/components/settings/DataPanel";
import { AccountEditSheet, type EditableAccount } from "@/components/settings/AccountEditSheet";
import { CategoryEditSheet, type EditableCategory } from "@/components/settings/CategoryEditSheet";
import { ChevronDownIcon, PlusIcon } from "@/components/shell/icons";
import { formatMXN, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Panel = "accounts" | "categories" | null;

export default function Perfil() {
  const t = useT();
  // One open at a time: both lists expanded would push the session panel far
  // enough down that it stops feeling like part of this screen.
  const [open, setOpen] = useState<Panel>(null);

  // Only fetched once its list is opened — most visits here are for the theme
  // or the language and never touch either.
  const { data: accounts } = useSWR<EditableAccount[]>(
    open === "accounts" ? "/api/accounts" : null, fetcher
  );
  const { data: categories } = useSWR<EditableCategory[]>(
    open === "categories" ? "/api/categories" : null, fetcher
  );

  const [editingAccount, setEditingAccount] = useState<EditableAccount | "new" | null>(null);
  const [editingCategory, setEditingCategory] = useState<EditableCategory | "new" | null>(null);

  function toggle(panel: Exclude<Panel, null>) {
    setOpen((current) => (current === panel ? null : panel));
  }

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pt-4 pb-6 space-y-3">
      <h1 className="text-[15px] font-semibold text-text mb-4">{t.profile.title}</h1>

      <ThemeToggle />
      <LanguageToggle />

      <section>
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
          {t.profile.manage}
        </p>

        <div className="panel px-4">
          <ManageSection
            label={t.profile.accounts}
            hint={t.profile.accountsHint}
            open={open === "accounts"}
            onToggle={() => toggle("accounts")}
          >
            {(accounts ?? []).map((a) => (
              <ItemRow
                key={a.id}
                color={a.color}
                name={a.account}
                meta={a.isCredit ? t.wallet.credit : t.wallet.debit}
                onClick={() => setEditingAccount(a)}
              />
            ))}
            <AddRow label={t.wallet.addAccount} onClick={() => setEditingAccount("new")} />
          </ManageSection>

          <ManageSection
            label={t.profile.categories}
            hint={t.profile.categoriesHint}
            open={open === "categories"}
            onToggle={() => toggle("categories")}
          >
            {(categories ?? []).map((c) => (
              <ItemRow
                key={c.id}
                color={c.color}
                name={c.name}
                meta={
                  c.kind === "expense" && c.budget > 0
                    ? formatMXN(c.budget)
                    : c.kind === "income"
                      ? t.categorySheet.income
                      : "—"
                }
                onClick={() => setEditingCategory(c)}
              />
            ))}
            <AddRow label={t.analytics.addCategory} onClick={() => setEditingCategory("new")} />
          </ManageSection>
        </div>
      </section>

      <DataPanel />

      <AccountPanel />

      <AccountEditSheet
        key={editingAccount === "new" ? "new-account" : `account-${editingAccount?.id ?? "none"}`}
        account={editingAccount === "new" ? null : editingAccount}
        open={editingAccount !== null}
        onClose={() => setEditingAccount(null)}
      />

      <CategoryEditSheet
        key={editingCategory === "new" ? "new-category" : `category-${editingCategory?.id ?? "none"}`}
        category={editingCategory === "new" ? null : editingCategory}
        open={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
      />
    </div>
  );
}

/** A settings row that opens downward instead of leaving for another tab. */
function ManageSection({
  label, hint, open, onToggle, children,
}: {
  label: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-divider first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press w-full flex items-center justify-between gap-3 py-3.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[13.5px] text-text">{label}</span>
          <span className="block text-[11.5px] text-text-dim mt-0.5">{hint}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-text-faint shrink-0 transition-transform duration-200 ease-out",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-300 ease-out",
          open ? "max-h-[2000px]" : "max-h-0"
        )}
      >
        <div className="pb-1.5">{children}</div>
      </div>
    </div>
  );
}

function ItemRow({
  color, name, meta, onClick,
}: {
  color: string | null;
  name: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press w-full flex items-center justify-between gap-2.5 py-2.5 pl-3 border-t border-divider text-left"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ backgroundColor: color ?? "var(--color-text-faint)" }}
        />
        <span className="text-[13px] text-text truncate">{name}</span>
      </span>
      <span className="font-mono text-[10.5px] text-text-dim shrink-0">{meta}</span>
    </button>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press w-full flex items-center gap-2.5 py-2.5 pl-3 border-t border-divider text-left text-accent"
    >
      <PlusIcon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[13px]">{label}</span>
    </button>
  );
}
