import { PageHeader } from "@/components/app/page-header";
import { rolesFor } from "@/lib/access";
import { requireSession } from "@/lib/session";

export default async function Page() {
  await requireSession(rolesFor("/settings"));
  return <PageHeader title="Settings" description="Coming in a later step." />;
}
