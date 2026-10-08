"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { mutate } from "swr";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarClock, WalletCards, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_PRESETS,
  CUSTOM_COLOR_CYCLE,
  EXPENSE_CATEGORY_PRESETS,
  INCOME_CATEGORY_PRESETS,
  SUGGESTED_ACCOUNTS,
  SUGGESTED_EXPENSE_CATEGORIES,
  SUGGESTED_INCOME_CATEGORIES,
} from "@/services/presets";
import { useT } from "@/lib/i18n-react";

type Screen = 0 | 1;
const SCREENS = 2;

interface CustomAccount {
  account: string;
  isCredit: boolean;
}

/**
 * Two light screens and straight into the app. Everything else a ledger
 * could use (balances, card days, budgets, fixed bills) waits on Inicio's
 * "Primeros pasos", where each one is asked for once it means something.
 * Categories aren't asked at all: the suggested ones are created with their
 * icons, and are edited in Perfil like any other.
 */
export default function BienvenidaPage() {
  const t = useT();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;

  const [screen, setScreen] = useState<Screen>(0);
  const [direction, setDirection] = useState(1);

  const [picked, setPicked] = useState<string[]>(SUGGESTED_ACCOUNTS);
  const [custom, setCustom] = useState<CustomAccount[]>([]);
  const [newName, setNewName] = useState("");
  const [newIsCredit, setNewIsCredit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = picked.length + custom.length;

  function go(next: Screen) {
    setDirection(next > screen ? 1 : -1);
    setError(null);
    setScreen(next);
  }

  function toggle(name: string) {
    setPicked((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));
  }

  function addCustom() {
    const name = newName.trim();
    if (!name) return;
    const taken = [...ACCOUNT_PRESETS.map((p) => p.account), ...custom.map((c) => c.account)];
    if (ACCOUNT_PRESETS.some((p) => p.account === name)) {
      // Typing a preset's name just selects the preset.
      if (!picked.includes(name)) setPicked([...picked, name]);
    } else if (!taken.includes(name)) {
      setCustom([...custom, { account: name, isCredit: newIsCredit }]);
    }
    setNewName("");
    setNewIsCredit(false);
  }

  async function finish() {
    if (total === 0) {
      setError(t.onboarding.pickOne);
      return;
    }
    setSaving(true);
    setError(null);

    const accounts = [
      ...ACCOUNT_PRESETS.filter((p) => picked.includes(p.account)).map((p) => ({
        account: p.account,
        isCredit: p.isCredit,
        kind: p.kind ?? null,
        color: p.color,
      })),
      ...custom.map((c, i) => ({
        account: c.account,
        isCredit: c.isCredit,
        color: CUSTOM_COLOR_CYCLE[i % CUSTOM_COLOR_CYCLE.length],
      })),
    ];
    const pick = (names: string[], presets: typeof EXPENSE_CATEGORY_PRESETS, kind: "expense" | "income") =>
      names.map((name) => ({ name, kind, color: presets.find((p) => p.name === name)?.color }));
    const categories = [
      ...pick(SUGGESTED_EXPENSE_CATEGORIES, EXPENSE_CATEGORY_PRESETS, "expense"),
      ...pick(SUGGESTED_INCOME_CATEGORIES, INCOME_CATEGORY_PRESETS, "income"),
    ];

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts, categories }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error ?? t.onboarding.saveFailed);
        setSaving(false);
        return;
      }
      await mutate(() => true, undefined, { revalidate: false });
      router.push("/");
      router.refresh();
    } catch {
      setError(t.common.offline);
      setSaving(false);
    }
  }

  const everyday = ACCOUNT_PRESETS.filter((p) => !p.isCredit);
  const credit = ACCOUNT_PRESETS.filter((p) => p.isCredit);

  const slide = reduceMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (d: number) => ({ opacity: 0, x: d * 28 }),
        center: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: d * -28 }),
      };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 pt-safe">
        <div
          className="max-w-[440px] mx-auto pt-6 pb-2 flex items-center gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={SCREENS}
          aria-valuenow={screen + 1}
          aria-label={t.onboarding.stepOf(screen + 1, SCREENS)}
        >
          {Array.from({ length: SCREENS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300 ease-out",
                i <= screen ? "bg-accent" : "bg-surface-2"
              )}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 pb-44 overflow-x-hidden">
        <div className="max-w-[440px] mx-auto grid">
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.section
              key={screen}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduceMotion ? { duration: 0.15 } : { type: "spring", visualDuration: 0.3, bounce: 0 }}
              className="[grid-area:1/1]"
            >
              {screen === 0 ? (
                <Welcome name={firstName} />
              ) : (
                <div className="pt-6">
                  <h1 className="text-[24px] font-semibold text-text leading-tight tracking-[-0.02em]">
                    {t.onboarding.accountsTitle}
                  </h1>
                  <p className="text-[14px] text-text-dim mt-2 leading-relaxed">{t.onboarding.accountsSubtitle}</p>

                  <Group label={t.onboarding.groupEveryday}>
                    {everyday.map((p) => (
                      <Chip key={p.account} active={picked.includes(p.account)} color={p.color} onClick={() => toggle(p.account)}>
                        {p.account}
                      </Chip>
                    ))}
                    {custom.filter((c) => !c.isCredit).map((c) => (
                      <Chip key={c.account} active onClick={() => setCustom(custom.filter((x) => x !== c))}>
                        {c.account}
                      </Chip>
                    ))}
                  </Group>

                  <Group label={t.onboarding.groupCredit}>
                    {credit.map((p) => (
                      <Chip key={p.account} active={picked.includes(p.account)} color={p.color} onClick={() => toggle(p.account)}>
                        {p.account}
                      </Chip>
                    ))}
                    {custom.filter((c) => c.isCredit).map((c) => (
                      <Chip key={c.account} active onClick={() => setCustom(custom.filter((x) => x !== c))}>
                        {c.account}
                      </Chip>
                    ))}
                  </Group>

                  <div className="mt-7 panel px-4 py-3.5 space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustom();
                          }
                        }}
                        maxLength={60}
                        placeholder={t.onboarding.otherAccount}
                        aria-label={t.onboarding.otherAccount}
                        className="flex-1 min-w-0 rounded-md bg-surface-2 border border-border px-3.5 py-2.5 min-h-[44px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
                      />
                      <Button variant="secondary" className="shrink-0 min-h-[44px]" onClick={addCustom} disabled={!newName.trim()}>
                        {t.onboarding.add}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] text-text-dim">{t.onboarding.isCredit}</span>
                      <Switch checked={newIsCredit} onChange={setNewIsCredit} label={t.onboarding.isCredit} />
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 glass border-t border-border px-5 pb-safe">
        <div className="max-w-[440px] mx-auto pt-3.5 pb-4 space-y-2.5">
          {error && (
            <p role="alert" className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5">
              {error}
            </p>
          )}
          {screen === 0 ? (
            <>
              <Button size="lg" className="w-full py-3.5" onClick={() => go(1)}>
                {t.onboarding.start}
              </Button>
              <p className="text-center font-mono text-[10.5px] text-text-faint uppercase tracking-wide">
                {t.onboarding.startHint}
              </p>
            </>
          ) : (
            <div className="flex gap-2.5">
              <Button variant="secondary" size="lg" className="py-3.5 px-5" onClick={() => go(0)} disabled={saving}>
                {t.onboarding.back}
              </Button>
              <Button size="lg" className="flex-1 py-3.5" loading={saving} onClick={finish} disabled={total === 0}>
                {t.onboarding.finish}
                <span className="font-normal opacity-70">· {t.onboarding.selectedCount(total)}</span>
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function Welcome({ name }: { name: string | null }) {
  const t = useT();
  const points: { icon: LucideIcon; text: string }[] = [
    { icon: Zap, text: t.onboarding.pointLog },
    { icon: WalletCards, text: t.onboarding.pointBalances },
    { icon: CalendarClock, text: t.onboarding.pointAhead },
  ];
  return (
    <div className="pt-10">
      <Image src="/TrackLHLogo.png" alt="" width={48} height={48} className="logo-mark w-12 h-12 rounded-md object-cover" />
      <h1 className="text-[30px] font-semibold text-text leading-[1.12] tracking-[-0.03em] mt-8">
        {t.onboarding.greeting(name)}
      </h1>
      <p className="text-[19px] font-medium text-text leading-snug tracking-[-0.01em] mt-2 text-balance">
        {t.onboarding.welcomeTitle}
      </p>
      <p className="text-[15px] text-text-muted leading-relaxed mt-3 max-w-[38ch]">{t.onboarding.welcomeBody}</p>

      <ul className="mt-9 space-y-4">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3.5">
            <span className="w-9 h-9 shrink-0 rounded-md bg-accent/12 text-accent flex items-center justify-center">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[14.5px] text-text">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
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
          className={cn("w-[7px] h-[7px] rounded-full shrink-0 transition-opacity duration-150", active ? "opacity-100" : "opacity-40")}
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  );
}
