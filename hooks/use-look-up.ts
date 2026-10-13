"use client";
import { useApi } from "@/lib/use-api";

export function useLookup() {
  const call = useApi();
  return (code: string) =>
    call<{ id: string; name: string; price: string }>(
      `/products/lookup/${encodeURIComponent(code)}`,
    );
}
