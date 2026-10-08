import { prisma } from "@/lib/prisma";
import type { ProfileView } from "@/types";

/** The signed-in person's profile and preferences, as the screens read them. */
export async function getProfile(userId: string): Promise<ProfileView | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true, name: true, passwordHash: true, avatarColor: true,
      defaultAccount: true, defaultType: true, weekStart: true, analyticsPeriod: true,
      theme: true, language: true,
      oauthAccounts: { select: { provider: true } },
    },
  });
  if (!user) return null;
  return {
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    defaultAccount: user.defaultAccount,
    defaultType: user.defaultType as ProfileView["defaultType"],
    weekStart: user.weekStart === 0 ? 0 : 1,
    analyticsPeriod: (user.analyticsPeriod as ProfileView["analyticsPeriod"]) ?? "month",
    theme: user.theme as ProfileView["theme"],
    language: user.language as ProfileView["language"],
    hasPassword: user.passwordHash !== null,
    providers: Array.from(new Set(user.oauthAccounts.map((a) => a.provider))),
  };
}

/** Monday unless the person chose Sunday; read only when a week is asked for. */
export async function getWeekStart(userId: string): Promise<0 | 1> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { weekStart: true } });
  return user?.weekStart === 0 ? 0 : 1;
}
