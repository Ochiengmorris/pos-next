import { ShiftView, type Shift } from "@/components/shift/shift-view";
import { api } from "@/lib/api.server";
import { requireSession } from "@/lib/session";

export default async function ShiftPage() {
  await requireSession();
  const shift = await api<Shift>("/reports/shift"); // defaults to today for the signed-in user
  return <ShiftView initial={shift} />;
}
