"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  MoreVertical,
  Plus,
  Search,
  Tags,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useDebounced } from "@/hooks/use-debounced";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { Category } from "@/lib/pos/types";
import {
  PRODUCTS_PAGE_SIZE,
  type ManagedProduct,
  type ProductsPage,
} from "@/lib/products/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { CategoriesDialog } from "./categories-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import { StockBadge } from "./stock-badge";
import Link from "next/link";
import { downloadText } from "@/lib/csv";

const money = (v: string) => formatKsh(toCents(v));

export function ProductsManager({
  initialCategories,
  initialData,
}: {
  initialCategories: Category[];
  initialData: ProductsPage;
}) {
  const call = useApi();
  const [categories, setCategories] = useState(initialCategories);
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [lowStock, setLowStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedProduct | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<ManagedProduct | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  const debouncedSearch = useDebounced(search, 250);
  const skipFirst = useRef(true);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the server already gave us page 1
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(PRODUCTS_PAGE_SIZE),
        });
        if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
        if (categoryId !== "all") qs.set("categoryId", categoryId);
        if (lowStock) qs.set("lowStock", "true");
        if (includeInactive) qs.set("includeInactive", "true");
        const res = await call<ProductsPage>(`/products?${qs}`);
        if (cancelled) return;
        if (res.items.length === 0 && page > 1) {
          setPage(page - 1); // the last row on this page just went away
          return;
        }
        setData(res);
        setError(null);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    call,
    debouncedSearch,
    categoryId,
    lowStock,
    includeInactive,
    page,
    tick,
  ]);

  async function reloadCategories() {
    try {
      setCategories(await call<Category[]>("/categories"));
    } catch {
      /* the dialog already showed an error */
    }
    reload(); // product rows show category names
  }

  async function setActive(p: ManagedProduct, active: boolean) {
    try {
      await call(`/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: active }),
      });
      toast.success(active ? `${p.name} reactivated` : `${p.name} deactivated`);
      reload();
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update the product",
      );
      return false;
    }
  }

  const categoryItems = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const { items, meta } = data;
  const filtered =
    search !== "" || categoryId !== "all" || lowStock || includeInactive;
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Products"
        description="Everything you sell, with prices and stock levels."
        actions={
          <div className="flex gap-2">
            <Link
              href="/products/import"
              className={buttonVariants({
                variant: "outline",
                className: "h-11",
              })}
            >
              <Upload aria-hidden /> Import
            </Link>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={async () => {
                try {
                  downloadText(
                    "products.csv",
                    await call<string>("/products/export"),
                  );
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Could not export",
                  );
                }
              }}
            >
              <Download aria-hidden /> Export
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setCategoriesOpen(true)}
            >
              <Tags aria-hidden /> Categories
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden /> Add product
            </Button>
          </div>
        }
      />

      <div role="search" className="flex flex-wrap items-center gap-3">
        <InputGroup className="h-11 max-w-sm min-w-60 flex-1 bg-card border-none focus-visible:border-3">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, SKU or barcode…"
            aria-label="Search products"
            autoComplete="off"
          />
        </InputGroup>

        <Select
          items={categoryItems}
          value={categoryId}
          onValueChange={(val) => {
            setCategoryId(val ?? "all");
            setPage(1);
          }}
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
            id="f-low"
            checked={lowStock}
            onCheckedChange={(c) => {
              setLowStock(c);
              setPage(1);
            }}
          />
          <Label htmlFor="f-low">Low stock only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="f-inactive"
            checked={includeInactive}
            onCheckedChange={(c) => {
              setIncludeInactive(c);
              setPage(1);
            }}
          />
          <Label htmlFor="f-inactive">Show inactive</Label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {error}
            <Button type="button" size="sm" variant="outline" onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          "rounded-xl border border-secondary/20 bg-card flex-1 shadow-sm transition-opacity",
          loading && "opacity-60",
        )}
        aria-busy={loading}
      >
        <Table>
          <caption className="sr-only">Products</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Cost
              </TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-12">
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
                  {filtered ? (
                    <>
                      No products match.{" "}
                      <button
                        type="button"
                        className="font-medium text-secondary-foreground underline underline-offset-2"
                        onClick={() => {
                          setSearch("");
                          setCategoryId("all");
                          setLowStock(false);
                          setIncludeInactive(false);
                          setPage(1);
                        }}
                      >
                        Clear filters
                      </button>
                    </>
                  ) : (
                    "No products yet. Add your first one."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(!p.isActive && "opacity-60")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {!p.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.sku}
                      {p.barcode ? ` · ${p.barcode}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.category?.name ?? (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money(p.price)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                    {money(p.costPrice)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-8 tabular-nums">{p.stockQty}</span>
                      <StockBadge
                        qty={p.stockQty}
                        reorderLevel={p.reorderLevel}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon",
                        })}
                        aria-label={`Actions for ${p.name}`}
                      >
                        <MoreVertical aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        {p.isActive ? (
                          <DropdownMenuItem onClick={() => setDeactivating(p)}>
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => void setActive(p, true)}
                          >
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            Showing {first}–{first + items.length - 1} of {meta.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage(meta.page - 1)}
            >
              Previous
            </Button>
            <span aria-live="polite">
              Page {meta.page} of {meta.pages}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={meta.page >= meta.pages || loading}
              onClick={() => setPage(meta.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        onChanged={() => void reloadCategories()}
      />

      <Dialog
        open={deactivating !== null}
        onOpenChange={(o) => !deactivateBusy && !o && setDeactivating(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {deactivating?.name}?</DialogTitle>
            <DialogDescription>
              It will stop appearing at the till and can no longer be sold. Past
              sales keep their history, and you can reactivate it any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={deactivateBusy}
              onClick={() => setDeactivating(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={deactivateBusy}
              onClick={async () => {
                if (!deactivating) return;
                setDeactivateBusy(true);
                const ok = await setActive(deactivating, false);
                setDeactivateBusy(false);
                if (ok) setDeactivating(null);
              }}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
