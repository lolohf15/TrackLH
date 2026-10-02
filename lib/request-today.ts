import type { NextRequest } from "next/server";
import { todayAnchor } from "@/services/period";

/**
 * "Today" on the reader's clock, sent by the client as `?today=YYYY-MM-DD`.
 * The server runs in UTC, and at 8 pm in Mexico it already thinks it's
 * tomorrow, which would move a card's cut or due date a day early.
 */
export function readToday(req: NextRequest): Date {
  const raw = req.nextUrl.searchParams.get("today");
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`);
    if (!isNaN(d.getTime())) return d;
  }
  return todayAnchor();
}
