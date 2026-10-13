import {
  type Unclaimed,
  UnclaimedManager,
} from "@/components/reports/unclaimed-manager";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import { requireSession } from "@/lib/session";

export default async function UnclaimedPage() {
  await requireSession(rolesFor("/reports"));
  const rows = await api<Unclaimed[]>("/payments/mpesa/unclaimed");
  return <UnclaimedManager initial={rows} />;
}
