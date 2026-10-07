import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Where the app layout sends a session whose user is gone (deleted from the
 * database while the cookie lived on). A layout can't clear cookies, so it
 * hands off here. Only an orphaned session is ended: anyone else landing on
 * this URL goes home untouched, so a link to it can't sign a person out.
 */
export async function GET() {
  const session = await auth();
  const id = session?.user?.id;
  if (id) {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (user) redirect("/");
  }
  await signOut({ redirectTo: "/login" });
}
