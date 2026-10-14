// import { Spinner } from "@/components/global-loader";

import { Spinner } from "./global-loader";

// Next.js shows this automatically while a route segment (and its data) loads.
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full items-center justify-center"
    >
      <Spinner />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
