import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="mx-auto grid max-w-6xl gap-5"
      aria-busy="true"
      aria-label="Loading stock count"
    >
      <div className="grid gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Header actions */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-32 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>

      {/* Summary metrics - 5 cards */}
      <section aria-label="Count summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </section>

      {/* Enter counts section (when open) */}
      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Skeleton className="h-12 min-w-60 flex-1 rounded-lg" /> {/* Search input */}
        <Skeleton className="h-10 w-48 rounded-lg" /> {/* Scan mode switch */}
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Matches list */}
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Picked product form */}
        <Skeleton className="h-5 w-48" /> {/* Status message */}
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-64" /> {/* Tabs list */}
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 w-64 rounded-lg" /> {/* Filter search */}
          <Skeleton className="h-10 w-48 rounded-lg" /> {/* Show system switch */}
        </div>
      </div>

      {/* Products table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Skeleton className="h-12 w-full" /> {/* Table header */}
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full border-t" />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  );
}