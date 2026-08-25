import type { NextAuthConfig } from "next-auth";

/** Routes reachable without a session. Everything else redirects to /login. */
const PUBLIC_ROUTES = ["/login", "/registro"];

/** Signing up necessarily happens before there is a session to check. */
const PUBLIC_APIS = ["/api/register"];

/**
 * The half of the auth config that carries no database import, so the proxy
 * can evaluate a request without pulling Prisma into that bundle. The
 * credentials provider lives in `auth.ts` alongside the database.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const signedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (PUBLIC_APIS.some((r) => pathname.startsWith(r))) return true;

      // An API caller wants a status code, not a login page it would try to
      // parse as JSON. Pages still get the redirect.
      if (pathname.startsWith("/api/") && !signedIn) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
      }

      const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

      // A signed-in visitor has no business on the login screen.
      if (signedIn && isPublic) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      return isPublic || signedIn;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
