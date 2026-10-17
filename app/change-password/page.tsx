import type { Metadata } from "next";
import { ForcePasswordChange } from "@/components/auth/force-password-change";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Choose a password" };

export default async function ChangePasswordPage() {
  await requireSession();
  return <ForcePasswordChange />;
}
