import { HomeIcon, LinesIcon, WalletIcon, GridIcon } from "./icons";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/movimientos", label: "Movimientos", icon: LinesIcon },
  { href: "/cuentas", label: "Cuentas", icon: WalletIcon },
  { href: "/categorias", label: "Categorías", icon: GridIcon },
] as const;
