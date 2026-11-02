import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="mx-auto grid max-w-5xl gap-6"
      aria-busy="true"
      aria-label="Loading stock counts"
    >
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Open count alert area */}
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* Stock counts table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Skeleton className="h-12 w-full" /> {/* Table header */}
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full border-t" />
        ))}
      </div>
    </div>
  );
}