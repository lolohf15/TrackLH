import type { PointerEvent } from "react";

export type GlassMode = "clear" | "solid";

export const GLASS_KEY = "tracklh-glass";

/**
 * Safari doesn't expose iOS's Reduce Transparency to the page
 * (`prefers-reduced-transparency` is Chromium-only), so the app asks for it
 * itself. The choice is the device's, like the iOS setting it stands in for,
 * and lives in localStorage rather than on the profile.
 *
 * Inlined into <head> like the theme's boot script: glass that turns solid
 * after the first paint is a flash on every load.
 */
export const GLASS_BOOT_SCRIPT = `
try {
  if (localStorage.getItem("${GLASS_KEY}") === "solid") {
    document.documentElement.setAttribute("data-glass", "solid");
  }
} catch (e) {}
`.trim();

const listeners = new Set<() => void>();

export function subscribeToGlass(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function currentGlass(): GlassMode {
  return document.documentElement.getAttribute("data-glass") === "solid" ? "solid" : "clear";
}

export function serverGlass(): GlassMode {
  return "clear";
}

export function applyGlass(mode: GlassMode): void {
  const root = document.documentElement;
  if (mode === "solid") root.setAttribute("data-glass", "solid");
  else root.removeAttribute("data-glass");

  try {
    localStorage.setItem(GLASS_KEY, mode);
  } catch {
    // Private mode, or storage denied. It still applies for this visit.
  }

  for (const listener of listeners) listener();
}

/**
 * Moves a glass control's light to where the finger landed (`.glass-touch`
 * reads --touch-x/--touch-y). Set once on press, on the control itself, so
 * nothing else restyles.
 */
export function lightAt(e: PointerEvent<HTMLElement>): void {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--touch-x", `${e.clientX - r.left}px`);
  el.style.setProperty("--touch-y", `${e.clientY - r.top}px`);
}
