export type InventorySummary = {
  activeProducts: number;
  totalUnits: number;
  stockValueAtCost: string;
  stockValueAtRetail: string;
  outOfStock: number;
  lowStock: number;
};

export type MovementType = "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  PURCHASE: "Restock",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
};

export type Movement = {
  id: string;
  type: MovementType;
  quantity: number; // signed: negative = stock out
  reason: string | null;
  saleId: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  user: { id: string; name: string } | null;
};

export type MovementsPage = {
  items: Movement[];
  meta: { total: number; page: number; limit: number; pages: number };
};
