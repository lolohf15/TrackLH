import {
  ArrowLeftRight, Baby, Banknote, BookOpen, Briefcase, Car, Clapperboard, Coffee,
  CreditCard, Droplet, Dumbbell, Ellipsis, Fuel, Gamepad2, Gift, GraduationCap,
  HandCoins, HeartPulse, House, Landmark, Laptop, Lightbulb, Music, Package, PawPrint,
  Pill, PiggyBank, Plane, Receipt, Repeat, Scissors, Shirt, ShoppingBag, ShoppingBasket,
  Smartphone, Sparkles, TrendingUp, Bus, Undo2, Utensils, Wifi, Wine, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isCategoryIconKey, type CategoryIconKey } from "@/lib/category-icons";

/** The one place a stored key turns into a drawing. */
export const CATEGORY_ICONS: Record<CategoryIconKey, LucideIcon> = {
  groceries: ShoppingBasket,
  food: Utensils,
  coffee: Coffee,
  bars: Wine,
  treats: Sparkles,
  transport: Bus,
  car: Car,
  gas: Fuel,
  travel: Plane,
  home: House,
  utilities: Lightbulb,
  electricity: Zap,
  water: Droplet,
  phone: Smartphone,
  internet: Wifi,
  subscriptions: Repeat,
  bills: Receipt,
  essentials: Package,
  repairs: Wrench,
  health: HeartPulse,
  pharmacy: Pill,
  gym: Dumbbell,
  beauty: Scissors,
  education: GraduationCap,
  books: BookOpen,
  shopping: ShoppingBag,
  clothes: Shirt,
  gifts: Gift,
  tech: Laptop,
  pets: PawPrint,
  baby: Baby,
  entertainment: Clapperboard,
  games: Gamepad2,
  music: Music,
  salary: Briefcase,
  freelance: Banknote,
  cash: HandCoins,
  investments: TrendingUp,
  savings: PiggyBank,
  refunds: Undo2,
  card: CreditCard,
  bank: Landmark,
  transfer: ArrowLeftRight,
  other: Ellipsis,
};

const SIZES = {
  /** List rows: matches the 22px ring the rows used before icons. */
  sm: { box: "w-[22px] h-[22px]", glyph: 12, letter: "text-[10px]" },
  md: { box: "w-8 h-8", glyph: 16, letter: "text-[13px]" },
  /** The record sheet's picker: a 44px touch target on its own. */
  lg: { box: "w-11 h-11", glyph: 20, letter: "text-[16px]" },
} as const;

/**
 * A category's mark: its icon on a circle tinted with its colour. A category
 * with no icon yet (or one saved by a future version with a key this build
 * doesn't know) shows the first letter of its name instead of nothing.
 */
export function CategoryIcon({
  icon,
  name,
  color,
  size = "md",
  className,
}: {
  icon: string | null | undefined;
  name: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const Glyph = isCategoryIconKey(icon) ? CATEGORY_ICONS[icon] : null;

  return (
    <span
      aria-hidden="true"
      className={cn("rounded-full grid place-items-center shrink-0", s.box, className)}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        color,
      }}
    >
      {Glyph ? (
        <Glyph size={s.glyph} strokeWidth={2} />
      ) : (
        <span className={cn("font-semibold leading-none", s.letter)}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
