import { cookies } from "next/headers";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { api } from "@/lib/api.server";
import {
  PRODUCT_PAGE_SIZE,
  type Category,
  type ProductPage,
} from "@/lib/pos/types";
import { requireSession } from "@/lib/session";

export default async function PosPage() {
  await requireSession();
  const initialMode =
    (await cookies()).get("pos_mode")?.value === "grid" ? "grid" : "scan";
  const [categories, products] = await Promise.all([
    api<Category[]>("/categories"),
    api<ProductPage>(`/products?limit=${PRODUCT_PAGE_SIZE}`),
  ]);
  return (
    <PosTerminal
      categories={categories}
      initialProducts={products}
      initialMode={initialMode}
    />
  );
}
