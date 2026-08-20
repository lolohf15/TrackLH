import { SquareIcon, LinesIcon, RectangleIcon, DiamondIcon } from "./icons";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: SquareIcon },
  { href: "/movimientos", label: "Movimientos", icon: LinesIcon },
  { href: "/cuentas", label: "Cuentas", icon: RectangleIcon },
  { href: "/categorias", label: "Categorías", icon: DiamondIcon },
] as const;
