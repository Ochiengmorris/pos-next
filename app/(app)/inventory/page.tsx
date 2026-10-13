import { InventoryManager } from "@/components/inventory/inventory-manager";
import { api } from "@/lib/api.server";
import { rolesFor } from "@/lib/access";
import type { InventorySummary } from "@/lib/inventory/types";
import type { Category } from "@/lib/pos/types";
import type { ProductsPage } from "@/lib/products/types";
import { requireSession } from "@/lib/session";

export default async function InventoryPage() {
  await requireSession(rolesFor("/inventory"));
  const [summary, categories, products] = await Promise.all([
    api<InventorySummary>("/inventory/summary"),
    api<Category[]>("/categories"),
    api<ProductsPage>("/products?page=1&limit=20"),
  ]);
  return (
    <InventoryManager
      summary={summary}
      categories={categories}
      initialData={products}
    />
  );
}
