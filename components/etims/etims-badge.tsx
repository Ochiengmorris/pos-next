import { Badge } from "@/components/ui/badge";
import type { EtimsDisplay } from "@/lib/pos/types";

export function EtimsBadge({ status }: { status: EtimsDisplay }) {
  switch (status) {
    case "ACCEPTED":
      return (
        <Badge variant="secondary" className="bg-teal-50 text-teal-800">
          eTIMS filed
        </Badge>
      );
    case "MOCK_ACCEPTED":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800"
        >
          eTIMS mock
        </Badge>
      );
    case "PENDING":
      return <Badge variant="outline">eTIMS pending</Badge>;
    case "FAILED":
      return <Badge variant="destructive">eTIMS failed</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">eTIMS cancelled</Badge>;
    default:
      return <span className="text-muted-foreground">-</span>;
  }
}
