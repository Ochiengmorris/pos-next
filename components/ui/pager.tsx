import { Button } from "@/components/ui/button";

type Meta = { total: number; page: number; limit: number; pages: number };

export function Pager({
  meta,
  count,
  loading,
  onPage,
}: {
  meta: Meta;
  count: number;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (meta.total === 0) return null;
  const first = (meta.page - 1) * meta.limit + 1;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        Showing {first}–{first + count - 1} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={meta.page <= 1 || loading}
          onClick={() => onPage(meta.page - 1)}
        >
          Previous
        </Button>
        <span aria-live="polite">
          Page {meta.page} of {meta.pages}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={meta.page >= meta.pages || loading}
          onClick={() => onPage(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
