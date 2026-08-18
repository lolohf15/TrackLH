import { cn } from "@/lib/utils";

const variants = {
  Gasto:         "bg-red-bg text-red-fg border border-red-border",
  Ingreso:       "bg-green-bg text-green-fg border border-green-border",
  Transferencia: "bg-amber-bg text-amber-fg border border-amber-border",
  default:       "bg-surface-2 text-text-dim border border-border",
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
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant] ?? variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
