import { TransactionsManager } from "@/components/transactions/transactions-manager";
import { api } from "@/lib/api.server";
import { canAccess } from "@/lib/access";
import type { SalesPage } from "@/lib/sales/types";
import { requireSession } from "@/lib/session";

export default async function TransactionsPage() {
  const session = await requireSession(); // open to every signed-in user; the API scopes cashiers to their own sales
  const sales = await api<SalesPage>("/sales?page=1&limit=20");
  return (
    <TransactionsManager
      initialData={sales}
      canVoid={canAccess(session.user.role, ["MANAGER"])}
    />
  );
}
