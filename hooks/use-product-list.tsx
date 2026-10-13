"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounced } from "@/hooks/use-debounced";
import type { ProductsPage } from "@/lib/products/types";
import { useApi } from "@/lib/use-api";

export type ProductFilters = {
  search: string;
  categoryId: string;
  lowStock: boolean;
};

// Server-side search, category, low-stock and paging. Starts from server-rendered page 1.
export function useProductList(initial: ProductsPage, pageSize: number) {
  const call = useApi();
  const [data, setData] = useState(initial);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    categoryId: "all",
    lowStock: false,
  });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounced(filters.search, 250);
  const skipFirst = useRef(true);

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
          limit: String(pageSize),
        });
        if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
        if (filters.categoryId !== "all")
          qs.set("categoryId", filters.categoryId);
        if (filters.lowStock) qs.set("lowStock", "true");
        const res = await call<ProductsPage>(`/products?${qs}`);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
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
    filters.categoryId,
    filters.lowStock,
    page,
    tick,
    pageSize,
  ]);

  const update = useCallback((patch: Partial<ProductFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, filters, update, setPage, reload };
}
