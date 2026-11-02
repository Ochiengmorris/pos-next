import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="grid gap-4 md:h-[calc(100dvh-7rem)] md:grid-cols-[minmax(0,1fr)_360px]"
      role="status"
      aria-busy="true"
      aria-label="Loading the till"
    >
      <section className="flex min-h-0 flex-col gap-3">
        {/* Search bar */}
        <Skeleton className="h-12 w-full" />

        {/* Category chips */}
        <Skeleton className="h-10 w-full" />

        {/* Transaction feed / Cart lines area */}
        <div className="min-h-72 flex-1 rounded-xl border border-secondary/20 bg-card shadow-sm">
          <Skeleton className="h-12 w-full border-t border-secondary/20" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full border-t border-secondary/20" />
          ))}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-4">
        {/* Cart summary / Cart panel header */}
        <div className="rounded-xl border border-secondary/20 bg-card shadow-sm">
          <Skeleton className="h-16 w-full border-b border-secondary/20" />
          <Skeleton className="h-24 w-full" /> {/* Total amount */}
          <Skeleton className="h-12 w-full" /> {/* Pay/Clear buttons */}
        </div>

        {/* Category chips in aside (scan mode) */}
        <div className="rounded-xl border border-secondary/20 bg-card shadow-sm">
          <Skeleton className="h-10 w-full border-b border-secondary/20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Product list / Product grid area */}
        <div className="min-h-80 flex-1 rounded-xl border border-secondary/20 bg-card shadow-sm overflow-hidden">
          <Skeleton className="h-12 w-full border-b border-secondary/20" /> {/* Category chips or header */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Product grid items or list items */}
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full border-t border-secondary/20 p-3" />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}