import { cn } from "@/lib/utils";

const variants = {
  Gasto:         "bg-red-900/20 text-[#f85149] border border-red-800/50",
  Ingreso:       "bg-green-900/20 text-[#3fb950] border border-green-800/50",
  Transferencia: "bg-amber-900/20 text-[#d29922] border border-amber-800/50",
  default:       "bg-[#21262d] text-[#8b949e] border border-[#30363d]",
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
