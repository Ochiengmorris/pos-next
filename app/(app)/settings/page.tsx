// import { SettingsForm } from "@/components/settings/settings-form";
import { rolesFor } from "@/lib/access";
import { api } from "@/lib/api.server";
import type { StoreSettings } from "@/lib/settings/types";
import { requireSession } from "@/lib/session";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  await requireSession(rolesFor("/settings"));
  const store = await api<StoreSettings>("/settings/store");
  return <SettingsForm initial={store} />;
}
