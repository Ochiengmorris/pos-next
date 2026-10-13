export type Role = "ADMIN" | "MANAGER" | "CASHIER";

// Same semantics as the backend RolesGuard: ADMIN can do everything
export const canAccess = (role: Role, allowed: Role[]) =>
  role === "ADMIN" || allowed.includes(role);

export const homeFor = (role: Role) =>
  role === "CASHIER" ? "/pos" : "/dashboard";

// Prefixes not listed here (e.g. /pos, /transactions) are open to any signed-in user
export const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/dashboard", roles: ["MANAGER"] },
  { prefix: "/products", roles: ["MANAGER"] },
  { prefix: "/inventory", roles: ["MANAGER"] },
  { prefix: "/reports", roles: ["MANAGER"] },
  { prefix: "/staff", roles: ["ADMIN"] },
  { prefix: "/settings", roles: ["ADMIN"] },
];

export const PUBLIC_PATHS = ["/login", "/session-expired"];

// roles allowed for a path, from the same table the route guard uses
export const rolesFor = (path: string): Role[] | undefined =>
  ROUTE_ROLES.find((r) => path.startsWith(r.prefix))?.roles;
