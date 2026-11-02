import { notFound } from "next/navigation";
import { CountSheet } from "@/components/stock-count/count-sheet";
import { rolesFor } from "@/lib/access";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api.server";
import { requireSession } from "@/lib/session";
import type { CountSummary, LinesPage } from "@/lib/stock-count/types";

export default async function CountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession(rolesFor("/stock-count"));

  let summary: CountSummary;
  let lines: LinesPage;
  try {
    [summary, lines] = await Promise.all([
      api<CountSummary>(`/stock-counts/${id}`),
      api<LinesPage>(
        `/stock-counts/${id}/lines?filter=counted&page=1&limit=20`,
      ),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <CountSheet
      initial={summary}
      initialLines={lines}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}
