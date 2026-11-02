import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="mx-auto grid max-w-7xl gap-6"
      aria-busy="true"
      aria-label="Loading cash summary"
    >
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Date picker in header actions */}
      <Skeleton className="h-11 w-44 rounded-lg" />

      {/* Alerts for open shifts */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* KPI Cards - 4 cards */}
      <section aria-label="Day totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </section>

      {/* Shifts table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Skeleton className="h-12 w-full" /> {/* Table header */}
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full border-t" />
        ))}
      </div>
    </div>
  );
}