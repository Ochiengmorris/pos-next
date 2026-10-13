import {
  Boxes,
  ChartColumn,
  Clock,
  House,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { ROUTE_ROLES, canAccess, type Role } from "@/lib/access";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Pos", href: "/pos", icon: ShoppingCart },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "My shift", href: "/shift", icon: Clock },
  { label: "Products", href: "/products", icon: Package },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Reports", href: "/reports", icon: ChartColumn },
  { label: "Staff", href: "/staff", icon: UserCog },
  { label: "Settings", href: "/settings", icon: Settings },
];

// An item shows only if the role may open its route (items with no rule are open to everyone)
export function visibleNav(role: Role): NavItem[] {
  return NAV.filter((item) => {
    const rule = ROUTE_ROLES.find((r) => item.href.startsWith(r.prefix));
    return !rule || canAccess(role, rule.roles);
  });
}
