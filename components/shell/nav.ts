import { HomeIcon, ChartIcon, WalletIcon, UserIcon } from "./icons";
import type { Dictionary } from "@/lib/dictionary";

/**
 * Four tabs split by what you came to do: see how you're going, understand
 * where it went, operate your money, or configure the app. The add button
 * isn't here — it's the raised center button the tab bar draws between
 * items two and three.
 *
 * Labels are dictionary keys, not text: the bar resolves them at render so
 * the tabs follow the language switch like everything else.
 */
export const NAV_ITEMS = [
  { href: "/", key: "home", icon: HomeIcon },
  { href: "/analytics", key: "analytics", icon: ChartIcon },
  { href: "/wallet", key: "wallet", icon: WalletIcon },
  { href: "/perfil", key: "profile", icon: UserIcon },
] as const satisfies ReadonlyArray<{
  href: string;
  key: keyof Dictionary["nav"];
  icon: unknown;
}>;
