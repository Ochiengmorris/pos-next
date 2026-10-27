import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  cards = 0,
  rows = 8,
}: {
  cards?: number;
  rows?: number;
}) {
  return (
    <div
      className="mx-auto grid max-w-7xl gap-6"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <div className="grid gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      {cards > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}
      <div className="grid gap-2 rounded-xl border border-secondary/20 bg-card p-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
