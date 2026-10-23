import { EtimsManager } from "@/components/etims/etims-manager";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import type { EtimsSummary, InvoicesPage } from "@/lib/etims/types";
import { requireSession } from "@/lib/session";

export default async function EtimsPage() {
  const session = await requireSession(rolesFor("/etims"));
  const [summary, invoices] = await Promise.all([
    api<EtimsSummary>("/etims/summary"),
    api<InvoicesPage>("/etims/invoices?page=1&limit=20"),
  ]);
  return (
    <EtimsManager
      initialSummary={summary}
      initialInvoices={invoices}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}
