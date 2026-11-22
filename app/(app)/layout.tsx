import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/session";
import { StoreSettings } from "@/lib/settings/types";
import { api } from "@/lib/api.server";

// The shop name is cosmetic here, so a failed lookup must never break the shell.
// api() signals a redirect (expired session, forced password change) by
// throwing, so those errors are re-thrown.
export async function getStoreName(): Promise<string | undefined> {
  try {
    const store = await api<StoreSettings>("/settings/store");
    return store.name?.trim() || undefined;
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT"))
      throw e;
    return undefined;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession(); // authenticated even if the route guard were bypassed
  const defaultOpen =
    (await cookies()).get("sidebar_state")?.value !== "closed"; // remember the toggle

  const storeName = await getStoreName();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar role={session.user.role} storeName={storeName} />
      <SidebarInset>
        <Topbar
          name={session.user.name ?? "User"}
          email={session.user.email ?? ""}
          role={session.user.role}
        />
        {/* SidebarInset is already a <main>, so this is a plain div */}
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
