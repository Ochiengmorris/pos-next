"use client";

import { Badge } from "@/components/ui/badge";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { Product } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

function StockBadge({ p }: { p: Product }) {
  if (p.stockQty <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (p.stockQty <= p.reorderLevel) {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-800"
      >
        Low: {p.stockQty} left
      </Badge>
    );
  }
  return <Badge variant="secondary">{p.stockQty} in stock</Badge>;
}

function StockNote({ p }: { p: Product }) {
  if (p.stockQty <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (p.stockQty <= p.reorderLevel)
    return <Badge variant="warning">Low: {p.stockQty} left</Badge>;
  return (
    <span className="text-xs text-muted-foreground">{p.stockQty} in stock</span>
  );
}

function ProductTile({
  p,
  inCart,
  onAdd,
}: {
  p: Product;
  inCart: number;
  onAdd: (p: Product) => void;
}) {
  const out = p.stockQty <= 0;
  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onAdd(p)}
      className={cn(
        "relative flex min-h-28 w-full flex-col justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-colors",
        "hover:border-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-card",
        inCart > 0 && "border-primary bg-accent",
      )}
    >
      <p className="line-clamp-2 pr-8 text-sm font-medium leading-snug">
        {p.name}
      </p>
      <div className="flex items-end justify-between gap-2">
        <p className="figure text-base font-semibold">
          {formatKsh(toCents(p.price))}
        </p>
        <StockNote p={p} />
      </div>
      {inCart > 0 && (
        <span className="figure absolute right-2 top-2 grid min-w-6 place-items-center rounded-md bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
          {inCart}
        </span>
      )}
    </button>
  );
}

export function ProductGrid({
  products,
  cartQty,
  onAdd,
}: {
  products: Product[];
  cartQty: Record<string, number>;
  onAdd: (p: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        No products match your search.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((p) => (
        <li key={p.id}>
          <ProductTile p={p} inCart={cartQty[p.id] ?? 0} onAdd={onAdd} />
        </li>
      ))}
    </ul>
  );
}

// Scan mode: a text-only list for items without barcodes (and for searching by name)
export function ProductList({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (p: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        No products match.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {products.map((p) => {
        const out = p.stockQty <= 0;
        const low = !out && p.stockQty <= p.reorderLevel;
        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={out}
              onClick={() => onAdd(p)}
              className="flex h-12 w-full items-center gap-3 px-4 text-left text-sm hover:bg-accent/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.name}
              </span>
              <span
                className={`shrink-0 text-xs ${out ? "font-medium text-destructive" : low ? "font-medium text-amber-700" : "text-muted-foreground"}`}
              >
                {out
                  ? "Out of stock"
                  : low
                    ? `Low: ${p.stockQty} left`
                    : `${p.stockQty} in stock`}
              </span>
              <span className="figure w-24 shrink-0 text-right font-semibold">
                {formatKsh(toCents(p.price))}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
