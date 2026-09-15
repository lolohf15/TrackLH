import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiMessages } from "@/lib/api-lang";

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

/**
 * Turns a thrown `UnauthorizedError` into 401 and anything else into 500.
 *
 * The 500 says nothing beyond "something broke": everything this app refuses
 * on purpose answers 400, 404 or 409 with its own message, so anything
 * reaching here is a failure nobody wrote a sentence for — usually the
 * database's own, which is neither translatable nor the reader's business.
 * The real error goes to the log instead.
 */
export async function errorResponse(err: unknown, context: string): Promise<NextResponse> {
  const m = await apiMessages();

  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: m.unauthorized }, { status: 401 });
  }

  console.error(`[${context}]`, err);
  return NextResponse.json({ error: m.internal }, { status: 500 });
}
