"use client";

import useSWR, { mutate } from "swr";
import type { ProfileView } from "@/types";

export const PROFILE_KEY = "/api/profile";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/** The signed-in person's profile; shared, so every screen reads one fetch. */
export function useProfile() {
  return useSWR<ProfileView>(PROFILE_KEY, fetcher, { revalidateOnFocus: false });
}

/**
 * Saves some preferences. The screen shows the change at once and the server
 * answer replaces it; a refusal puts the old value back and is thrown so the
 * caller can say why.
 */
export async function saveProfile(patch: Partial<ProfileView>): Promise<ProfileView> {
  let saved: ProfileView | null = null;
  await mutate<ProfileView>(
    PROFILE_KEY,
    async () => {
      const res = await fetch(PROFILE_KEY, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Error");
      saved = body as ProfileView;
      return saved;
    },
    {
      optimisticData: (current) => ({ ...(current as ProfileView), ...patch }),
      rollbackOnError: true,
      revalidate: false,
    }
  );
  return saved!;
}
