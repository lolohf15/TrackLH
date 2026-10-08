import { initialsOf } from "@/services/profile-input";
import { inkOn } from "@/lib/color";
import { cn } from "@/lib/utils";

/**
 * The person as a round mark: their emoji if they chose one, otherwise their
 * initials, on their colour (the accent until they pick).
 */
export function Avatar({
  name,
  email,
  emoji,
  color,
  size = 36,
  className,
}: {
  name: string | null | undefined;
  email?: string | null;
  emoji?: string | null;
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
        fontSize: emoji ? size * 0.5 : size * 0.38,
        ...(fill ? { background: fill, color: inkOn(fill) } : null),
      }}
    >
      {emoji || initialsOf(name, email)}
    </span>
  );
}
