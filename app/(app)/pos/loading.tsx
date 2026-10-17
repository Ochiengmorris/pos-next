import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px]"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading the till…</span>
      <div className="grid content-start gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <Skeleton className="h-112 w-full" />
    </div>
  );
}
