"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PRODUCT_PAGE_SIZE,
  type Product,
  type ProductPage,
} from "@/lib/pos/types";
import { useApi } from "@/lib/use-api";

// Starts from server-rendered data; refetches when the search or category changes (debounced for typing)
export function useProducts(
  initial: ProductPage,
  search: string,
  categoryId: string | null,
) {
  const call = useApi();
  const [items, setItems] = useState<Product[]>(initial.items);
  const [total, setTotal] = useState(initial.meta.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the server already gave us the first page
      return;
    }
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(
      async () => {
        try {
          const qs = new URLSearchParams({ limit: String(PRODUCT_PAGE_SIZE) });
          if (search.trim()) qs.set("search", search.trim());
          if (categoryId) qs.set("categoryId", categoryId);
          const page = await call<ProductPage>(`/products?${qs}`);
          if (!cancelled) {
            setItems(page.items);
            setTotal(page.meta.total);
            setError(null);
          }
        } catch (e) {
          if (!cancelled)
            setError(
              e instanceof Error ? e.message : "Could not load products",
            );
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      search ? 200 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [call, search, categoryId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { items, total, loading, error, refresh };
}
