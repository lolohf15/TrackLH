import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell/AppShell";

/** The signed-in app: tab bar, sidebar and the floating add button. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Someone who never finished the wizard has no accounts to show, so send
  // them back to it rather than to an empty dashboard.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });
  if (!user?.onboardedAt) redirect("/bienvenida");

  return <AppShell>{children}</AppShell>;
}
