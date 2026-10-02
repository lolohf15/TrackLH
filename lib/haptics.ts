/**
 * A short tap of the Taptic Engine when a movement is logged.
 *
 * iOS Safari has never implemented `navigator.vibrate`. Since iOS 18, though,
 * toggling a native `<input type="checkbox" switch>` plays the system haptic,
 * and clicking its label from script counts. This leans on that: it is
 * undocumented, so it can stop working in any iOS release — which is fine,
 * because a missing buzz loses nothing. Android and other browsers that do
 * implement vibrate get a 10ms pulse instead.
 *
 * Only call it from inside a user gesture (or shortly after one): WebKit
 * ignores the switch outside of user activation.
 */
let label: HTMLLabelElement | null = null;

function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (label?.isConnected) return label;

  label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText =
    "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

export function hapticTap(): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
      return;
    }
    ensureSwitch()?.click();
  } catch {
    // A haptic is a nicety; never let it break a save.
  }
}
