import { initialsOf } from "@/services/profile-input";
import { inkOn } from "@/lib/color";
import { cn } from "@/lib/utils";

/** The person as a round mark: their initials on their colour (the accent until they pick). */
export function Avatar({
  name,
  email,
  color,
  size = 36,
  className,
}: {
  name: string | null | undefined;
  email?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}) {
  const fill = color ?? null;
  return (
    <span
      aria-hidden
      className={cn("grid place-items-center rounded-full shrink-0 select-none font-semibold", !fill && "bg-accent text-accent-ink", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        ...(fill ? { background: fill, color: inkOn(fill) } : null),
      }}
    >
      {initialsOf(name, email)}
    </span>
  );
}
