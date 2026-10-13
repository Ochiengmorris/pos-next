// stock state as words, not just color
import { Badge } from "@/components/ui/badge";

export function StockBadge({
  qty,
  reorderLevel,
}: {
  qty: number;
  reorderLevel: number;
}) {
  if (qty <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (qty <= reorderLevel) {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-800"
      >
        Low stock
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-teal-50 text-teal-800">
      In stock
    </Badge>
  );
}
