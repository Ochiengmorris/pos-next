"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LoadingContextValue = {
  /** True while at least one task is loading */
  isLoading: boolean;
  /** Manually start a loading task */
  start: () => void;
  /** Manually stop a loading task */
  stop: () => void;
  /** Wrap a promise (or async function) so loading is shown until it settles */
  withLoading: <T>(task: Promise<T> | (() => Promise<T>)) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  // A counter (not a boolean) so overlapping requests don't hide the loader early
  const [count, setCount] = useState(0);

  const start = useCallback(() => setCount((c) => c + 1), []);
  const stop = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  const withLoading = useCallback(
    async <T,>(task: Promise<T> | (() => Promise<T>)) => {
      start();
      try {
        return await (typeof task === "function" ? task() : task);
      } finally {
        stop();
      }
    },
    [start, stop],
  );

  const value = useMemo(
    () => ({ isLoading: count > 0, start, stop, withLoading }),
    [count, start, stop, withLoading],
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside <LoadingProvider>");
  return ctx;
}
