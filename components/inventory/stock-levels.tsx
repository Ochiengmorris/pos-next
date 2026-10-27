"use client";

import { useMemo, useState } from "react";
import { MoreVertical, PackagePlus, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Pager } from "@/components/ui/pager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockBadge } from "@/components/products/stock-badge";
import { useProductList } from "@/hooks/use-product-list";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { Category } from "@/lib/pos/types";
import type { ManagedProduct, ProductsPage } from "@/lib/products/types";
import { cn } from "@/lib/utils";
import { StockActionDialog, type StockAction } from "./stock-action-dialog";

type Props = {
  initialData: ProductsPage;
  categories: Category[];
  onChanged: () => void;
  onHistory: (product: ManagedProduct) => void;
};

export function StockLevels({
  initialData,
  categories,
  onChanged,
  onHistory,
}: Props) {
  const list = useProductList(initialData, 5);
  const [action, setAction] = useState<StockAction | null>(null);
  const { items, meta } = list.data;

  const categoryItems = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  return (
    <div className="grid gap-4">
      <div role="search" className="flex flex-wrap items-center gap-3">
        <InputGroup className="h-11 max-w-sm min-w-60 flex-1 bg-card border-none focus-visible:border-3">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={list.filters.search}
            onChange={(e) => list.update({ search: e.target.value })}
            placeholder="Search name, SKU or barcode…"
            aria-label="Search products"
            autoComplete="off"
          />
        </InputGroup>

        <Select
          value={list.filters.categoryId}
          items={categoryItems}
          onValueChange={(v) => list.update({ categoryId: v ?? "all" })}
        >
          <SelectTrigger
            className="h-11 w-48 bg-card"
            aria-label="Filter by category"
          >
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="inv-low"
            checked={list.filters.lowStock}
            onCheckedChange={(c) => list.update({ lowStock: c })}
          />
          <Label htmlFor="inv-low">Low stock only</Label>
        </div>
      </div>

      {list.error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {list.error}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={list.reload}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          "rounded-xl border border-secondary/20 bg-card shadow-sm transition-opacity",
          list.loading && "opacity-60",
        )}
        aria-busy={list.loading}
      >
        <Table>
          <caption className="sr-only">Stock levels</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Reorder at
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Value at cost
              </TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-16 text-center text-muted-foreground"
                >
                  No products match.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.sku}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.category?.name ?? (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-10 tabular-nums">{p.stockQty}</span>
                      <StockBadge
                        qty={p.stockQty}
                        reorderLevel={p.reorderLevel}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                    {p.reorderLevel}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {formatKsh(toCents(p.costPrice) * p.stockQty)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10"
                        onClick={() =>
                          setAction({ mode: "restock", product: p })
                        }
                      >
                        <PackagePlus aria-hidden /> Restock
                      </Button>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon",
                          })}
                          aria-label={`More actions for ${p.name}`}
                        >
                          <MoreVertical aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className={"rounded-xl"}
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              setAction({ mode: "adjust", product: p })
                            }
                          >
                            Adjust stock
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setAction({ mode: "count", product: p })
                            }
                          >
                            Recount
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onHistory(p)}>
                            View history
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pager
        meta={meta}
        count={items.length}
        loading={list.loading}
        onPage={list.setPage}
      />

      <StockActionDialog
        action={action}
        onClose={() => setAction(null)}
        onDone={() => {
          setAction(null);
          list.reload();
          onChanged();
        }}
      />
    </div>
  );
}
