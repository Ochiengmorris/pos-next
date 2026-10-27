import { rolesFor } from "@/lib/access";
import { ImportWizard } from "@/lib/products/import-wizard";
import { requireSession } from "@/lib/session";

export default async function ImportPage() {
  await requireSession(rolesFor("/products"));
  return <ImportWizard />;
}
