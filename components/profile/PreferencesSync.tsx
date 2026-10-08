"use client";

import { useEffect, useRef } from "react";
import { useProfile } from "@/lib/use-profile";
import { applyTheme, currentTheme } from "@/lib/theme";
import { applyLang, currentLang } from "@/lib/i18n";

/**
 * Brings the theme and language chosen on another device to this one. The
 * device's own copy painted first (no flash); once the profile arrives, a
 * different saved choice wins, once per load. Renders nothing.
 */
export function PreferencesSync() {
  const { data } = useProfile();
  const done = useRef(false);

  useEffect(() => {
    if (!data || done.current) return;
    done.current = true;
    if (data.theme && data.theme !== currentTheme()) applyTheme(data.theme);
    if (data.language && data.language !== currentLang()) applyLang(data.language);
  }, [data]);

  return null;
}
