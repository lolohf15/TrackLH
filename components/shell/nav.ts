import { HomeIcon, ListIcon, WalletIcon, TagIcon } from "./icons";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/movimientos", label: "Movimientos", icon: ListIcon },
  { href: "/cuentas", label: "Cuentas", icon: WalletIcon },
  { href: "/categorias", label: "Categorías", icon: TagIcon },
] as const;
