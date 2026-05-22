import { cn } from "@/lib/utils";

const variants = {
  Gasto:         "bg-red-50 text-[#C0392B] border border-red-200",
  Ingreso:       "bg-green-50 text-[#16A34A] border border-green-200",
  Transferencia: "bg-amber-50 text-[#B8903A] border border-amber-200",
  default:       "bg-[#F8F5F0] text-[#6B7280] border border-[#E5DED2]",
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
