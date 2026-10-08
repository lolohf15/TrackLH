"use client";

import { signOut } from "next-auth/react";

/**
 * Signs out and drops this device's cached responses on the way: the service
 * worker caches API answers, so a shared phone would otherwise hand the next
 * person this session's data.
 */
export async function signOutClean(): Promise<void> {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  await signOut({ callbackUrl: "/login" });
}
