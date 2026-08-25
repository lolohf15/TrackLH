import { cn } from "@/lib/utils";

const variants = {
  Gasto:         "text-red-fg border-red-border",
  Ingreso:       "text-green-fg border-green-border",
  Transferencia: "text-amber-fg border-amber-border",
  default:       "text-text-dim border-border",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 border font-mono text-[10.5px] font-medium uppercase tracking-wide",
        variants[variant] ?? variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
