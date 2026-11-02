import { ShiftPanel } from "@/components/cash/shift-panel";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import type { CurrentShift } from "@/lib/cash/types";
import { requireSession } from "@/lib/session";

export default async function ShiftPage() {
  await requireSession(rolesFor("/shift"));
  return (
    <ShiftPanel initial={await api<CurrentShift>("/cash/shifts/current")} />
  );
}
