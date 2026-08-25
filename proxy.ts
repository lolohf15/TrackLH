import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 reads this file as `proxy.ts`, not `middleware.ts`. It runs the
// database-free half of the auth config, so Prisma never enters this bundle.
export default NextAuth(authConfig).auth;

export const config = {
  // Everything except Next internals, the auth endpoints themselves, and
  // static assets — the API routes included, so an unauthenticated fetch is
  // turned away before it reaches a handler.
  matcher: ["/((?!api/auth|_next/static|_next/image|icons|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|.*\\.png$).*)"],
};
