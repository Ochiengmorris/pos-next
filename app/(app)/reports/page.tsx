import { ReportsManager } from "@/components/reports/reports-manager";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import { businessToday } from "@/lib/dashboard/format";
import { loadReports } from "@/lib/reports/load";
import { rangeEndingAt } from "@/lib/reports/range";
import { requireSession } from "@/lib/session";

export default async function ReportsPage() {
  await requireSession(rolesFor("/reports"));
  const range = rangeEndingAt(businessToday(), "7d"); // read after the session, so the page is request-time
  const initial = await loadReports(api, range, "revenue");
  return <ReportsManager initial={initial} initialRange={range} />;
}
