// The red count beside "eTIMS" in the sidebar
"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/use-api";

export function useEtimsAttention(enabled: boolean) {
  const call = useApi();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const load = async () => {
      try {
        const s = await call<{ needsAttention: number }>("/etims/summary");
        if (!stopped) setCount(s.needsAttention);
      } catch {
        /* the badge just keeps its last value */
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [call, enabled]);

  return count;
}
