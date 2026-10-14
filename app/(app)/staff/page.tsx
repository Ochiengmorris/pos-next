import { StaffManager } from "@/components/staff/staff-manager";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import type { StaffPage } from "@/lib/staff/types";
import { requireSession } from "@/lib/session";

export default async function StaffPageRoute() {
  const session = await requireSession(rolesFor("/staff"));
  const staff = await api<StaffPage>("/users?page=1&limit=20");
  return <StaffManager initialData={staff} currentUserId={session.user.id} />;
}
