import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession(); // authenticated even if the route guard were bypassed
  const defaultOpen =
    (await cookies()).get("sidebar_state")?.value !== "closed"; // remember the toggle

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar role={session.user.role} />
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
