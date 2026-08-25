"use client";

import { cn } from "@/lib/utils";

/** The shared chrome of the login and signup screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="space-y-7">
      <div className="flex flex-col items-center text-center gap-3">
        <img src="/TrackLHLogo.png" alt="" className="w-11 h-11 rounded-md object-cover" />
        <div>
          <h1 className="font-mono text-sm font-semibold tracking-[0.15em] text-text">TRACKLH</h1>
          <p className="text-[19px] font-semibold text-text mt-4">{title}</p>
          <p className="text-[13.5px] text-text-dim mt-1.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      {children}

      <p className="text-center text-[13px] text-text-dim">{footer}</p>
    </div>
  );
}

export function AuthField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {label}
      </span>
      <input
        {...props}
        className={cn(
          "w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px]",
          "text-[15px] text-text outline-none placeholder:text-text-faint",
          "focus:border-accent/60 transition-colors duration-150",
          props.className
        )}
      />
    </label>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5"
    >
      {children}
    </p>
  );
}
