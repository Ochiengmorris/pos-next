"use client";

import { useLoading } from "@/providers/loading-provider";
import { useEffect, useState } from "react";
// import { useLoading } from "./loading-provider";

export function Spinner({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-primary ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Full-screen overlay driven by <LoadingProvider>. */
export function GlobalLoader({ delay = 150 }: { delay?: number }) {
  const { isLoading } = useLoading();
  const [visible, setVisible] = useState(false);

  // Only show after `delay` ms so quick requests don't cause a flicker
  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [isLoading, delay]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <Spinner />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
