import { redirect } from "next/navigation";
import { homeFor } from "@/lib/access";
import { requireSession } from "@/lib/session";

export default async function Home() {
  const session = await requireSession();
  redirect(homeFor(session.user.role));
}
