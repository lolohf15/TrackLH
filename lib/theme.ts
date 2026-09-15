export type Theme = "dark" | "light";

export const THEME_KEY = "tracklh-theme";

/** The colors behind the iOS status bar, per theme — `--color-bg` by hand. */
const THEME_COLOR: Record<Theme, string> = {
  dark: "#000000",
  light: "#faf8f4",
};

/**
 * Inlined into <head> and run before first paint. Dark is the default, so
 * only a saved light preference has to be applied here — and it has to happen
 * before the body renders or the app flashes dark on every load.
 *
 * Kept as a string rather than a module: by the time a bundle could run this,
 * the wrong theme has already painted.
 */
export const THEME_BOOT_SCRIPT = `
try {
  if (localStorage.getItem("${THEME_KEY}") === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    // The meta tag is emitted by the framework and may not be parsed yet.
    // The status bar isn't part of the paint, so settling it late is fine.
    addEventListener("DOMContentLoaded", function () {
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", "${THEME_COLOR.light}");
    });
  }
} catch (e) {}
`.trim();

/**
 * The theme's home is the `data-theme` attribute, not React state — the boot
 * script sets it before React exists. These three make it readable as an
 * external store, so a component can subscribe without an effect that
 * re-renders itself on mount.
 */
const listeners = new Set<() => void>();

export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Reads what's on the element, which the boot script already settled. */
export function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Server render has no element to read, and dark is the default anyway. */
export function serverTheme(): Theme {
  return "dark";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");

  // The status bar is painted by the OS from this tag, not from CSS, so it
  // has to be told separately or it stays the other theme's color.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode, or storage denied. The theme still applies for this visit.
  }

  for (const listener of listeners) listener();
}
