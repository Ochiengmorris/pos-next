// for client components (barcode scanner, cart, checkout)
"use client";
import { useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { ApiError, request } from "@/lib/api";

export function useApi() {
  const { data: session } = useSession();
  const token = session?.accessToken;

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
        throw e;
      }
    },
    [token],
  );
}
