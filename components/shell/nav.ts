import { HomeIcon, ChartIcon, WalletIcon, UserIcon } from "./icons";

/**
 * Four tabs split by what you came to do: see how you're going, understand
 * where it went, operate your money, or configure the app. The add button
 * isn't here — it's the raised center button the tab bar draws between
 * items two and three.
 */
export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/perfil", label: "Perfil", icon: UserIcon },
] as const;
