import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role, canAccess, homeFor } from "@/lib/access";

// Use at the top of protected server pages. Don't rely on proxy.ts alone.
export async function requireSession(roles?: Role[]) {
  const session = await auth();
  if (!session || session.error) redirect("/session-expired");
  if (roles && !canAccess(session.user.role, roles))
    redirect(homeFor(session.user.role));
  return session;
}
