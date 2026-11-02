import { cookies } from "next/headers";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { api } from "@/lib/api.server";
import {
  PRODUCT_PAGE_SIZE,
  type Category,
  type ProductPage,
} from "@/lib/pos/types";
import { requireSession } from "@/lib/session";
import { CurrentShift } from "@/lib/cash/types";
import { OpenShiftGate } from "@/components/cash/open-shift-gate";
import { StaleShiftBanner } from "@/components/cash/stale-shift-banner";

export default async function PosPage() {
  await requireSession();
  const cash = await api<CurrentShift>("/cash/shifts/current");
  if (cash.required && !cash.shift) return <OpenShiftGate />;
  const initialMode =
    (await cookies()).get("pos_mode")?.value === "grid" ? "grid" : "scan";
  const [categories, products] = await Promise.all([
    api<Category[]>("/categories"),
    api<ProductPage>(`/products?limit=${PRODUCT_PAGE_SIZE}`),
  ]);
  return (
    <>
      {cash.stale && <StaleShiftBanner />}
      <PosTerminal
        categories={categories}
        initialProducts={products}
        initialMode={initialMode}
      />
    </>
  );
}
