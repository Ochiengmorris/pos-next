import { CashManager } from "@/components/cash/cash-manager";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import type { DaySummary } from "@/lib/cash/types";
import { requireSession } from "@/lib/session";

export default async function CashPage() {
  await requireSession(rolesFor("/cash"));
  return <CashManager initial={await api<DaySummary>("/cash/summary")} />;
}
