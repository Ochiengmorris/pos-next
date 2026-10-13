import { formatKsh } from "@/lib/pos/money";
import type { CartLine } from "@/lib/pos/types";

// the item just scanned, big enough to read across the counter
export function LastScanned({ line }: { line?: CartLine }) {
  if (!line) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center text-muted-foreground">
        Ready to scan
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Last scanned
        </p>
        <p className="truncate text-2xl font-semibold">{line.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatKsh(line.priceCents)} × {line.quantity}
        </p>
      </div>
      <p className="shrink-0 text-3xl font-semibold tabular-nums">
        {formatKsh(line.priceCents * line.quantity)}
      </p>
    </div>
  );
}
