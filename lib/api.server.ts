// for server components and server actions
import "server-only";
import { redirect } from "next/navigation";
import { ApiError, request } from "@/lib/api";
import { requireSession } from "@/lib/session";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await requireSession();
  try {
    return await request<T>(
      process.env.API_URL!,
      session.accessToken,
      path,
      init,
    );
  } catch (e) {
    // token rejected (expired, or the account was deactivated): clear the session
    if (e instanceof ApiError && e.status === 401) redirect("/session-expired");
    throw e;
  }
}
