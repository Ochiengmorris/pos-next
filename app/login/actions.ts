"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  credentials: "Invalid email or password.",
  too_many_attempts: "Too many attempts. Wait a minute and try again.",
  api_unreachable: "Cannot reach the server. Check the connection.",
  error: "Something went wrong. Please try again.",
};

// Only allow same-site relative redirects
const safePath = (v: unknown) =>
  typeof v === "string" &&
  v.startsWith("/") &&
  !v.startsWith("//") &&
  !v.startsWith("/\\")
    ? v
    : "/";

export async function login(formData: FormData): Promise<LoginResult> {
  const redirectTo = safePath(formData.get("callbackUrl"));
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false, // return a result instead of throwing a redirect
    });
    return { ok: true, redirectTo };
  } catch (e) {
    if (e instanceof AuthError) {
      const code = e instanceof CredentialsSignin ? e.code : "error";
      return { ok: false, message: MESSAGES[code] ?? MESSAGES.error };
    }
    throw e;
  }
}
