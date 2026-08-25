import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Thrown by `requireUser` so a route can turn it into a 401 in one place. */
export class UnauthorizedError extends Error {
  constructor() {
    super("No autorizado");
    this.name = "UnauthorizedError";
  }
}

/**
 * The tenant id for the current request. Every query in this app is scoped by
 * it, so a route that forgets to call this fails to compile rather than
 * quietly serving someone else's ledger.
 */
export async function requireUser(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

/** Turns a thrown `UnauthorizedError` into 401 and anything else into 500. */
export function errorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  console.error(`[${context}]`, err);
  const message = err instanceof Error ? err.message : "Error interno del servidor";
  return NextResponse.json({ error: message }, { status: 500 });
}
