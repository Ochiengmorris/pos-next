"use client";
import { useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { ApiError, needsPasswordChange, request } from "@/lib/api";
import { useRouter } from "next/navigation";

export function useApi() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const router = useRouter();

  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      if (!token) throw new ApiError(401, "Not signed in");
      try {
        return await request<T>(
          process.env.NEXT_PUBLIC_API_URL!,
          token,
          path,
          init,
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await signOut({ redirectTo: "/login?code=session_expired" });
        }
        if (needsPasswordChange(e)) router.push("/change-password");
        throw e;
      }
    },
    [token, router],
  );
}
