export type StaffRole = "ADMIN" | "MANAGER" | "CASHIER";

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  mustChangePassword: string;
};

export type StaffPage = {
  items: StaffUser[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
};

export const ROLE_HELP: Record<StaffRole, string> = {
  CASHIER: "Sells at the till and sees their own sales.",
  MANAGER:
    "Everything a cashier does, plus products, inventory, reports and voiding sales.",
  ADMIN: "Everything, plus staff accounts and store settings.",
};
