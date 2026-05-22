import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-[#C6A15B] text-white hover:bg-[#B8904A] active:bg-[#A8803A] shadow-sm shadow-[#C6A15B]/20",
  secondary:
    "bg-white text-[#4B5563] border border-[#E5DED2] hover:bg-[#F8F5F0] hover:border-[#D4CCBE] hover:text-[#111827] active:bg-[#EFEAE2]",
  ghost:
    "text-[#6B7280] hover:bg-black/5 hover:text-[#111827] active:bg-black/8",
  danger:
    "bg-red-50 text-[#C0392B] border border-red-200 hover:bg-red-100 hover:border-red-300",
};

const sizes = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-sm px-5 py-2.5 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F8F5F0]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
