import { api } from "@/lib/api.server";
import { rolesFor } from "@/lib/access";
import type { Category } from "@/lib/pos/types";
import { PRODUCTS_PAGE_SIZE, type ProductsPage } from "@/lib/products/types";
import { requireSession } from "@/lib/session";
import { ProductsManager } from "@/components/products/product-manager";

export default async function ProductsPage() {
  await requireSession(rolesFor("/products"));
  const [categories, products] = await Promise.all([
    api<Category[]>("/categories"),
    api<ProductsPage>(`/products?page=1&limit=${PRODUCTS_PAGE_SIZE}`),
  ]);
  return (
    <ProductsManager initialCategories={categories} initialData={products} />
  );
}
