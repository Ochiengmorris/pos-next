import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Role } from "@/lib/access";
import { UserMenu } from "./user-menu";

export function Topbar(props: { name: string; email: string; role: Role }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="size-6" />
      {/* search and notifications arrive with the POS screen */}
      <div className="ml-auto">
        <UserMenu {...props} />
      </div>
    </header>
  );
}
