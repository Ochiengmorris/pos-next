import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="mx-auto grid max-w-7xl gap-6"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="grid gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Alerts area (for unclaimed M-Pesa / eTIMS attention) */}
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* KPI Cards - 4 cards */}
      <section aria-label="Today at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </section>

      {/* Sales Chart + Top Sellers */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}