import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };
// Only allow same-site relative redirects
const safePath = (v: unknown) =>
  typeof v === "string" &&
  v.startsWith("/") &&
  !v.startsWith("//") &&
  !v.startsWith("/\\")
    ? v
    : "/";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; code?: string }>;
}) {
  const { callbackUrl, code } = await searchParams;

  return (
    <main className="min-h-dvh overflow-hidden flex items-center justify-center">
      {/* Blurred supermarket background */}
      {/* <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 scale-105 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/img-1.png')",
          filter: "blur(6px)",
        }}
      /> */}

      {/* Soft overlay keeps the login card readable */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/65" />

      <div className="flex items-center justify-center px-4 py-10 sm:px-8 w-full">
        <div className="w-full max-w-md">
          {/* the brand panel is hidden below lg, so the logo moves here */}

          <Card className="shadow-md">
            <CardHeader className="flex flex-col items-center relative">
              <Logo className=" justify-center mt-2" />
              {/* <CardTitle
                role="heading"
                aria-level={1}
                className="text-[32px] leading-10"
              >
                Welcome back
              </CardTitle> */}
              <CardDescription className="mt-4">
                Sign in to continue to your store.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-6">
              <LoginForm
                callbackUrl={safePath(callbackUrl)}
                sessionExpired={code === "session_expired"}
              />
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-center text-xs text-muted-foreground">
                Trouble signing in? Ask your store manager <br /> to reset your
                password.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
