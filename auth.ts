import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveOAuthUser } from "@/lib/oauth-link";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
    Google,
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const email = String(raw?.email ?? "").trim().toLowerCase();
        const password = String(raw?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // A user with no hash signed up through a path that never set one;
        // treat it exactly like a wrong password rather than letting it in.
        if (!user?.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Both linking to an existing user and creating a new one trust the
      // email to belong to the person, so an unverified one is turned away.
      if (!profile?.email) return "/login?error=NoEmail";
      if (profile.email_verified !== true) return "/login?error=EmailNotVerified";
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        // First step of an outside sign-in: swap the provider's identity for
        // our own User.id, so everything downstream reads `uid` as before.
        token.uid = await resolveOAuthUser(prisma, {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: profile.email,
          name: profile.name,
        });
      } else if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});
