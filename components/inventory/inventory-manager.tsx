"use client";

import { useState } from "react";
import { Boxes, PackageMinus, PackageX, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
// import { KpiCard } from "@/components/dashboard/kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatInt, formatKsh, toCents } from "@/lib/pos/money";
import type { Category } from "@/lib/pos/types";
import type { InventorySummary } from "@/lib/inventory/types";
import type { ProductsPage } from "@/lib/products/types";
import { useApi } from "@/lib/use-api";
import { MovementsPanel } from "./movements-panel";
import { StockLevels } from "./stock-levels";
import { KpiCard } from "../dashboard/kpi-cards";

type Tab = "stock" | "movements";

export function InventoryManager({
  summary: initialSummary,
  categories,
  initialData,
}: {
  summary: InventorySummary;
  categories: Category[];
  initialData: ProductsPage;
}) {
  const call = useApi();
  const [summary, setSummary] = useState(initialSummary);
  const [tab, setTab] = useState<Tab>("stock");
  const [historyProduct, setHistoryProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function refreshSummary() {
    try {
      setSummary(await call<InventorySummary>("/inventory/summary"));
    } catch {
      /* the cards just keep their last values */
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Inventory"
        description="Stock levels, and every change that led to them."
      />

      <section
        aria-label="Stock summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Units in stock"
          value={formatInt(summary.totalUnits)}
          icon={Boxes}
          tone="blue"
        >
          <span>Across {summary.activeProducts} products</span>
        </KpiCard>
        <KpiCard
          label="Stock value"
          value={formatKsh(toCents(summary.stockValueAtCost))}
          icon={Wallet}
          tone="teal"
        >
          <span>
            At cost. {formatKsh(toCents(summary.stockValueAtRetail))} at retail.
          </span>
        </KpiCard>
        <KpiCard
          label="Low stock"
          value={String(summary.lowStock)}
          icon={PackageMinus}
          tone="amber"
        >
          <span>At or below reorder level</span>
        </KpiCard>
        <KpiCard
          label="Out of stock"
          value={String(summary.outOfStock)}
          icon={PackageX}
          tone="red"
        >
          <span>
            {summary.outOfStock === 0 ? "Nothing sold out" : "Cannot be sold"}
          </span>
        </KpiCard>
      </section>

      <div>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className={"flex flex-col"}
        >
          <TabsList>
            <TabsTrigger value="stock">Stock levels</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4">
            <StockLevels
              initialData={initialData}
              categories={categories}
              onChanged={() => void refreshSummary()}
              onHistory={(p) => {
                setHistoryProduct({ id: p.id, name: p.name });
                setTab("movements");
              }}
            />
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <MovementsPanel
              product={historyProduct}
              onClearProduct={() => setHistoryProduct(null)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
