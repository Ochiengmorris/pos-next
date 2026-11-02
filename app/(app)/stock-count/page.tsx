import { CountsList } from "@/components/stock-count/counts-list";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import { requireSession } from "@/lib/session";
import type { CountListItem } from "@/lib/stock-count/types";

export default async function StockCountPage() {
  await requireSession(rolesFor("/stock-count"));
  return <CountsList initial={await api<CountListItem[]>("/stock-counts")} />;
}
