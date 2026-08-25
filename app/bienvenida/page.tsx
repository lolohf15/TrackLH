"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_PRESETS,
  EXPENSE_CATEGORY_PRESETS,
  INCOME_CATEGORY_PRESETS,
  SUGGESTED_ACCOUNTS,
  SUGGESTED_EXPENSE_CATEGORIES,
  SUGGESTED_INCOME_CATEGORIES,
  CUSTOM_COLOR_CYCLE,
} from "@/services/presets";

type Step = 0 | 1 | 2;
const STEPS = ["Cuentas", "Categorías", "Presupuesto"] as const;

interface CustomAccount { account: string; isCredit: boolean }

export default function BienvenidaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  const [pickedAccounts, setPickedAccounts] = useState<string[]>(SUGGESTED_ACCOUNTS);
  const [customAccounts, setCustomAccounts] = useState<CustomAccount[]>([]);
  const [newAccount, setNewAccount] = useState("");
  const [newAccountIsCredit, setNewAccountIsCredit] = useState(false);

  const [pickedExpense, setPickedExpense] = useState<string[]>(SUGGESTED_EXPENSE_CATEGORIES);
  const [pickedIncome, setPickedIncome] = useState<string[]>(SUGGESTED_INCOME_CATEGORIES);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allExpenseNames = [...pickedExpense, ...customCategories];

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addAccount() {
    const name = newAccount.trim();
    if (!name) return;
    const taken = [...pickedAccounts, ...customAccounts.map((a) => a.account)];
    if (!taken.includes(name)) {
      setCustomAccounts([...customAccounts, { account: name, isCredit: newAccountIsCredit }]);
    }
    setNewAccount("");
    setNewAccountIsCredit(false);
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    if (!allExpenseNames.includes(name)) setCustomCategories([...customCategories, name]);
    setNewCategory("");
  }

  async function finish() {
    setSaving(true);
    setError(null);

    const accounts = [
      ...pickedAccounts.map((name) => {
        const preset = ACCOUNT_PRESETS.find((p) => p.account === name);
        return { account: name, isCredit: preset?.isCredit ?? false, color: preset?.color };
      }),
      ...customAccounts.map((a, i) => ({
        account: a.account,
        isCredit: a.isCredit,
        color: CUSTOM_COLOR_CYCLE[i % CUSTOM_COLOR_CYCLE.length],
      })),
    ];

    const categories = [
      ...pickedExpense.map((name) => {
        const preset = EXPENSE_CATEGORY_PRESETS.find((p) => p.name === name);
        const typed = budgets[name];
        return {
          name,
          kind: "expense" as const,
          color: preset?.color,
          budget: typed !== undefined && typed !== "" ? Number(typed) : preset?.budget ?? 0,
        };
      }),
      ...customCategories.map((name, i) => ({
        name,
        kind: "expense" as const,
        color: CUSTOM_COLOR_CYCLE[i % CUSTOM_COLOR_CYCLE.length],
        budget: budgets[name] ? Number(budgets[name]) : 0,
      })),
      ...pickedIncome.map((name) => ({
        name,
        kind: "income" as const,
        color: INCOME_CATEGORY_PRESETS.find((p) => p.name === name)?.color,
        budget: 0,
      })),
    ];

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts, categories }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? "No se pudo guardar tu configuración");
        setSaving(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      router.push("/");
      router.refresh();
    } catch {
      setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      setSaving(false);
    }
  }

  const canContinue =
    step === 0
      ? pickedAccounts.length + customAccounts.length > 0
      : step === 1
      ? allExpenseNames.length > 0
      : true;

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <header className="px-5 pt-safe">
        <div className="max-w-[440px] mx-auto pt-6 pb-4">
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1.5">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors duration-300 ease-out",
                    i <= step ? "bg-accent" : "bg-surface-2"
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[9.5px] uppercase tracking-wide",
                    i === step ? "text-text" : "text-text-faint"
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pb-40">
        <div className="max-w-[440px] mx-auto">
          {step === 0 && (
            <Section
              title="¿Qué cuentas usas?"
              hint="Elige las que tengas. Podrás agregar o quitar después."
            >
              <ChipGrid>
                {ACCOUNT_PRESETS.map((p) => (
                  <Chip
                    key={p.account}
                    active={pickedAccounts.includes(p.account)}
                    color={p.color}
                    onClick={() => toggle(pickedAccounts, setPickedAccounts, p.account)}
                  >
                    {p.account}
                  </Chip>
                ))}
                {customAccounts.map((a) => (
                  <Chip
                    key={a.account}
                    active
                    onClick={() =>
                      setCustomAccounts(customAccounts.filter((c) => c.account !== a.account))
                    }
                  >
                    {a.account}
                  </Chip>
                ))}
              </ChipGrid>

              <div className="mt-5 space-y-2.5">
                <div className="flex gap-2">
                  <input
                    value={newAccount}
                    onChange={(e) => setNewAccount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAccount();
                      }
                    }}
                    placeholder="Otra cuenta"
                    aria-label="Nombre de la cuenta"
                    className="flex-1 min-w-0 rounded-md bg-surface-2 border border-border px-3.5 py-2.5 min-h-[44px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
                  />
                  <button
                    type="button"
                    onClick={addAccount}
                    className="press rounded-md bg-surface-2 border border-border px-4 min-h-[44px] text-sm text-text-muted shrink-0"
                  >
                    Agregar
                  </button>
                </div>
                <label className="flex items-center gap-2.5 text-[13px] text-text-dim">
                  <input
                    type="checkbox"
                    checked={newAccountIsCredit}
                    onChange={(e) => setNewAccountIsCredit(e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  Es tarjeta de crédito
                </label>
              </div>
            </Section>
          )}

          {step === 1 && (
            <Section title="¿En qué gastas?" hint="Estas serán tus categorías de gasto.">
              <ChipGrid>
                {EXPENSE_CATEGORY_PRESETS.map((p) => (
                  <Chip
                    key={p.name}
                    active={pickedExpense.includes(p.name)}
                    color={p.color}
                    onClick={() => toggle(pickedExpense, setPickedExpense, p.name)}
                  >
                    {p.name}
                  </Chip>
                ))}
                {customCategories.map((name) => (
                  <Chip
                    key={name}
                    active
                    onClick={() => setCustomCategories(customCategories.filter((c) => c !== name))}
                  >
                    {name}
                  </Chip>
                ))}
              </ChipGrid>

              <div className="mt-4 flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="Otra categoría"
                  aria-label="Nombre de la categoría"
                  className="flex-1 min-w-0 rounded-md bg-surface-2 border border-border px-3.5 py-2.5 min-h-[44px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="press rounded-md bg-surface-2 border border-border px-4 min-h-[44px] text-sm text-text-muted shrink-0"
                >
                  Agregar
                </button>
              </div>

              <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mt-8 mb-3">
                ¿De dónde viene tu dinero?
              </p>
              <ChipGrid>
                {INCOME_CATEGORY_PRESETS.map((p) => (
                  <Chip
                    key={p.name}
                    active={pickedIncome.includes(p.name)}
                    color={p.color}
                    onClick={() => toggle(pickedIncome, setPickedIncome, p.name)}
                  >
                    {p.name}
                  </Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {step === 2 && (
            <Section
              title="¿Cuánto quieres gastar al mes?"
              hint="Puedes dejarlo en blanco y definirlo más adelante."
            >
              <div className="panel divide-y divide-divider">
                {allExpenseNames.map((name) => {
                  const preset = EXPENSE_CATEGORY_PRESETS.find((p) => p.name === name);
                  return (
                    <label key={name} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-[7px] h-[7px] rounded-full shrink-0"
                          style={{ backgroundColor: preset?.color ?? "#6b7075" }}
                        />
                        <span className="text-[14px] text-text truncate">{name}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-sm text-text-dim">$</span>
                        <input
                          inputMode="decimal"
                          value={budgets[name] ?? ""}
                          onChange={(e) =>
                            setBudgets({ ...budgets, [name]: e.target.value.replace(/[^\d.]/g, "") })
                          }
                          placeholder={String(preset?.budget ?? 0)}
                          aria-label={`Presupuesto de ${name}`}
                          className="w-20 rounded-sm bg-surface-2 border border-border px-2 py-1.5 font-mono text-sm text-text text-right tabular-nums outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </Section>
          )}

          {error && (
            <p className="mt-5 rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5">
              {error}
            </p>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-bg/90 backdrop-blur-xl border-t border-border/70 px-5 pb-safe">
        <div className="max-w-[440px] mx-auto py-4 space-y-3">
          <div className="flex gap-2.5">
            {step > 0 && (
              <Button
                variant="secondary"
                size="lg"
                className="py-3.5 px-6"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                Atrás
              </Button>
            )}
            {step < 2 ? (
              <Button
                size="lg"
                className="flex-1 py-3.5"
                disabled={!canContinue}
                onClick={() => setStep((s) => (s + 1) as Step)}
              >
                Continuar
              </Button>
            ) : (
              <Button size="lg" className="flex-1 py-3.5" loading={saving} onClick={finish}>
                Empezar
              </Button>
            )}
          </div>

          {step < 2 && (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="press w-full font-mono text-[10.5px] text-text-dim uppercase tracking-wide py-2 disabled:opacity-40"
            >
              Usar sugerencias y empezar
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Section({
  title, hint, children,
}: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-[22px] font-semibold text-text leading-tight">{title}</h1>
      <p className="text-[13.5px] text-text-dim mt-1.5 mb-6 leading-relaxed">{hint}</p>
      {children}
    </section>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  active, color, onClick, children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 min-h-[42px]",
        "text-[13.5px] transition-colors duration-150 ease-out",
        active
          ? "border-accent/70 bg-accent/12 text-text"
          : "border-border text-text-dim hover:border-border-strong"
      )}
    >
      {color && (
        <span
          className={cn("w-[7px] h-[7px] rounded-full shrink-0 transition-opacity duration-150",
            active ? "opacity-100" : "opacity-40")}
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  );
}
