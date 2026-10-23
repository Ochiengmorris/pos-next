export const PRODUCTS_PAGE_SIZE = 9;

// what a manager sees (cashiers never receive costPrice)
export type ManagedProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  costPrice: string;
  taxRate: string;
  stockQty: number;
  reorderLevel: number;
  isActive: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};

export type ProductsPage = {
  items: ManagedProduct[];
  meta: { total: number; page: number; limit: number; pages: number };
};
