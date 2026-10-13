"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { AlertCircle, LayoutGrid, ScanBarcode, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useProducts } from "@/hooks/use-products";
import { ApiError } from "@/lib/api";
import { cartReducer, cartTotals } from "@/lib/pos/cart";
import { newRequestId } from "@/lib/pos/request-id";
import type {
  Category,
  PaymentEntry,
  Product,
  ProductPage,
  Receipt,
} from "@/lib/pos/types";
import { useApi } from "@/lib/use-api";
import { CartLines, CartPanel, CartSummary } from "./cart-panel";
import { CategoryChips } from "./category-chips";
import { LastScanned } from "./last-scanned";
import { PaymentDialog } from "./payment-dialog";
import { ProductGrid, ProductList } from "./product-grid";
import { ReceiptDialog } from "./receipt-dialog";

export type Mode = "scan" | "grid";

type Props = {
  categories: Category[];
  initialProducts: ProductPage;
  initialMode: Mode;
};

export function PosTerminal({
  categories,
  initialProducts,
  initialMode,
}: Props) {
  const call = useApi();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { items, total, loading, error, refresh } = useProducts(
    initialProducts,
    search,
    categoryId,
  );
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [lastId, setLastId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const lastSignature = useRef("");
  const lastRequestId = useRef("");

  const totals = cartTotals(cart);
  const cartQty = Object.fromEntries(
    cart.map((l) => [l.productId, l.quantity]),
  );

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  function changeMode(m: Mode) {
    setMode(m);
    document.cookie = `pos_mode=${m}; path=/; max-age=31536000; samesite=lax`; // remembered on this device
    focusSearch();
  }

  // Shortcuts: F2 search, F9 pay. A scanner "types" into whatever has focus, so stray keystrokes go to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (!payOpen && !receipt && cart.length > 0) setPayOpen(true);
        return;
      }
      if (payOpen || receipt) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (e.target !== document.body) return;
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payOpen, receipt, cart.length]);

  function addToCart(p: Product, qty = 1) {
    if (p.stockQty <= 0) {
      toast.error(`${p.name} is out of stock`);
      return;
    }
    const inCart = cart.find((l) => l.productId === p.id)?.quantity ?? 0;
    if (inCart + qty > p.stockQty) {
      toast.warning(
        `Only ${p.stockQty} of ${p.name} in stock${inCart ? ` (${inCart} already in the sale)` : ""}`,
      );
      return;
    }
    dispatch({ type: "add", product: p, quantity: qty });
    setLastId(p.id);
    focusSearch();
  }

  function setQty(productId: string, quantity: number) {
    const line = cart.find((l) => l.productId === productId);
    if (!line) return;
    if (quantity > line.stockQty)
      toast.warning(`Only ${line.stockQty} of ${line.name} in stock`);
    dispatch({ type: "setQty", productId, quantity });
    focusSearch();
  }

  // Enter in the search box: exact barcode/SKU first (what a scanner sends), plain name search otherwise.
  // "5*600000000011" adds five.
  async function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = search.trim();
    if (!raw) return;

    const multiplied = /^(\d{1,3})\*(.+)$/.exec(raw);
    const qty = multiplied ? Number(multiplied[1]) : 1;
    const code = multiplied ? multiplied[2].trim() : raw;
    if (qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    try {
      const p = await call<Product>(
        `/products/lookup/${encodeURIComponent(code)}`,
      );
      addToCart(p, qty);
      setSearch("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.info(
          "No product with that code. Showing matching names instead.",
        );
      } else {
        toast.error(err instanceof Error ? err.message : "Lookup failed");
      }
    }
  }

  // Same cart + same payments = same key, so a retry can never create a second sale
  function requestIdFor(signature: string) {
    if (signature !== lastSignature.current) {
      lastSignature.current = signature;
      lastRequestId.current = newRequestId();
    }
    return lastRequestId.current;
  }

  async function checkout(entries: PaymentEntry[]) {
    const body = {
      items: cart.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
      })),
      payments: entries.map((e) => ({
        method: e.method,
        amount: Number((e.amountCents / 100).toFixed(2)),
        ...(e.tenderedCents !== undefined && {
          tendered: Number((e.tenderedCents / 100).toFixed(2)),
        }),
        ...(e.method === "CARD" && e.reference && { reference: e.reference }),
        ...(e.mpesaPaymentId && { mpesaPaymentId: e.mpesaPaymentId }),
      })),
    };

    let sale: { id: string; receiptNo: string };
    try {
      sale = await call<{ id: string; receiptNo: string }>("/sales", {
        method: "POST",
        body: JSON.stringify({
          ...body,
          clientRequestId: requestIdFor(JSON.stringify(body)),
        }),
      });
    } catch (e) {
      refresh(); // stock may have changed under us
      throw e; // the payment dialog shows the message
    }

    // The sale exists from here on, so nothing below may fail the checkout
    dispatch({ type: "clear" });
    setLastId(null);
    setPayOpen(false);
    refresh();
    toast.success(`Sale ${sale.receiptNo} complete`);
    try {
      setReceipt(await call<Receipt>(`/sales/${sale.id}/receipt`));
    } catch {
      toast.warning(
        `Sale ${sale.receiptNo} is saved, but the receipt couldn't be loaded. Find it under Transactions.`,
      );
      focusSearch();
    }
  }

  function clearSale() {
    dispatch({ type: "clear" });
    setLastId(null);
    focusSearch();
  }

  const searchBar = (
    <div className="grid gap-1">
      <div className="flex gap-2">
        <form
          onSubmit={onSearchSubmit}
          role="search"
          className="min-w-0 flex-1"
        >
          <InputGroup className="h-12 bg-card ">
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearch("")}
              placeholder="Scan barcode or search products…"
              aria-label="Scan barcode or search products"
              autoComplete="off"
              autoFocus
            />
          </InputGroup>
        </form>
        <div
          role="group"
          aria-label="Layout"
          className="flex shrink-0 gap-1 rounded-lg border bg-card p-1"
        >
          <Button
            type="button"
            variant={mode === "scan" ? "default" : "ghost"}
            aria-pressed={mode === "scan"}
            className="h-10 px-3"
            onClick={() => changeMode("scan")}
          >
            <ScanBarcode aria-hidden />{" "}
            <span className="hidden lg:inline">Scan</span>
          </Button>
          {/* <Button
            type="button"
            variant={mode === "grid" ? "default" : "ghost"}
            aria-pressed={mode === "grid"}
            className="h-10 px-3"
            onClick={() => changeMode("grid")}
          >
            <LayoutGrid aria-hidden />{" "}
            <span className="hidden lg:inline">Grid</span>
          </Button> */}
        </div>
      </div>
      {/* <p className="hidden text-xs text-muted-foreground md:block">
        F2 search · F9 pay · type <kbd className="font-mono">5*barcode</kbd> to
        add five
      </p> */}
    </div>
  );

  const errorAlert = error && (
    <Alert variant="destructive">
      <AlertCircle aria-hidden />
      <AlertDescription className="flex items-center justify-between gap-3">
        {error}
        <Button type="button" size="sm" variant="outline" onClick={refresh}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );

  const moreHint = total > items.length && (
    <p className="py-3 text-center text-xs text-muted-foreground">
      Showing {items.length} of {total} products. Search to find the rest.
    </p>
  );

  const dialogs = (
    <>
      <PaymentDialog
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) focusSearch();
        }}
        totalCents={totals.totalCents}
        onSubmit={checkout}
      />
      <ReceiptDialog
        receipt={receipt}
        onClose={() => {
          setReceipt(null);
          focusSearch();
        }}
      />
    </>
  );

  if (mode === "grid") {
    return (
      <div className="grid gap-4 md:h-[calc(100dvh-7rem)] md:grid-cols-[minmax(0,1fr)_400px]">
        <section className="flex min-h-0 flex-col gap-4">
          {searchBar}
          <CategoryChips
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
          {errorAlert}
          <div
            className={`min-h-0 flex-1 overflow-y-auto pr-1 transition-opacity ${loading ? "opacity-60" : ""}`}
            aria-busy={loading}
          >
            <ProductGrid
              products={items}
              cartQty={cartQty}
              onAdd={(p) => addToCart(p)}
            />
            {moreHint}
          </div>
        </section>
        <CartPanel
          lines={cart}
          highlightId={lastId}
          totalCents={totals.totalCents}
          vatCents={totals.vatCents}
          itemCount={totals.itemCount}
          onSetQty={setQty}
          onRemove={(id) => dispatch({ type: "remove", productId: id })}
          onClear={clearSale}
          onPay={() => setPayOpen(true)}
        />
        {dialogs}
      </div>
    );
  }

  // Scan mode: transaction feed on the left, total and quick product list on the right
  return (
    <div className="grid gap-4 md:h-[calc(100dvh-7rem)] md:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex min-h-0 flex-col gap-3">
        {searchBar}
        <LastScanned line={cart.find((l) => l.productId === lastId)} />
        <Card className="min-h-72 flex-1 gap-0 overflow-hidden py-0 md:min-h-0">
          <CartLines
            lines={cart}
            highlightId={lastId}
            onSetQty={setQty}
            onRemove={(id) => dispatch({ type: "remove", productId: id })}
          />
        </Card>
      </section>

      <aside className="flex min-h-0 flex-col gap-4">
        <Card className="gap-0 py-0">
          <CartSummary
            large
            totalCents={totals.totalCents}
            vatCents={totals.vatCents}
            itemCount={totals.itemCount}
            hasLines={cart.length > 0}
            onPay={() => setPayOpen(true)}
            onClear={clearSale}
          />
        </Card>
        <Card className="min-h-80 flex-1 gap-0 overflow-hidden py-0 md:min-h-0">
          <div className="border-b p-3">
            <CategoryChips
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>
          {errorAlert && <div className="p-3">{errorAlert}</div>}
          <div
            className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${loading ? "opacity-60" : ""}`}
            aria-busy={loading}
          >
            <ProductList products={items} onAdd={(p) => addToCart(p)} />
            {moreHint}
          </div>
        </Card>
      </aside>
      {dialogs}
    </div>
  );
}
