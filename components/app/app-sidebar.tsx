"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { canAccess, type Role } from "@/lib/access";
import { visibleNav } from "@/lib/nav";
import { useEtimsAttention } from "@/hooks/use-etims-attention";

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const items = visibleNav(role);
  const attention = useEtimsAttention(canAccess(role, ["MANAGER"]));
  return (
    <Sidebar>
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4">
        <Logo tone="light" />
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={href}
                          onClick={() => setOpenMobile(false)}
                          aria-current={active ? "page" : undefined}
                        />
                      }
                      isActive={active}
                      className="h-11 gap-3 rounded-lg"
                    >
                      <Icon aria-hidden />
                      <span>{label}</span>
                      {href === "/etims" && attention > 0 && (
                        <SidebarMenuBadge
                          aria-label={`${attention} tax invoices need attention`}
                          className="bg-destructive text-white mr-2"
                        >
                          {attention}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
