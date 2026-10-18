import type { Metadata } from "next";
import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { AlertCircle, Info, Mail } from "lucide-react";
import { signIn } from "@/auth";
import { LoginHero } from "@/components/auth/login-hero";
import { PasswordField, SubmitButton } from "@/components/auth/login-controls";
import { Logo } from "@/components/brand/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  credentials: "Invalid email or password.",
  too_many_attempts: "Too many attempts. Wait a minute and try again.",
  api_unreachable: "Cannot reach the server. Check the connection.",
  session_expired: "Your session expired. Please sign in again.",
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; code?: string }>;
}) {
  const { callbackUrl, code } = await searchParams;
  const isInfo = code === "session_expired";

  async function login(formData: FormData) {
    "use server";
    const target = safePath(formData.get("callbackUrl"));
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: target,
      });
    } catch (e) {
      if (e instanceof AuthError) {
        const errCode = e instanceof CredentialsSignin ? e.code : "error";
        redirect(
          `/login?code=${errCode}&callbackUrl=${encodeURIComponent(target)}`,
        );
      }
      throw e;
    }
  }

  return (
    // <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">

    <main className="min-h-dvh overflow-hidden flex items-center justify-center">
      {/* Blurred supermarket background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 scale-105 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/img-1.png')",
          filter: "blur(6px)",
        }}
      />

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
              {code && (
                <Alert
                  variant={isInfo ? "default" : "destructive"}
                  role={isInfo ? "status" : "alert"}
                >
                  {isInfo ? <Info aria-hidden /> : <AlertCircle aria-hidden />}
                  <AlertDescription
                    className={isInfo ? "text-foreground" : undefined}
                  >
                    {MESSAGES[code] ?? MESSAGES.error}
                  </AlertDescription>
                </Alert>
              )}

              <form action={login}>
                <input
                  type="hidden"
                  name="callbackUrl"
                  value={callbackUrl ?? "/"}
                />
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <InputGroup className="h-12">
                      <InputGroupAddon>
                        <Mail aria-hidden />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        placeholder="you@shop.com"
                        required
                        // autoFocus
                      />
                    </InputGroup>
                  </Field>

                  <PasswordField />

                  <Field>
                    <SubmitButton>Sign in</SubmitButton>
                  </Field>
                </FieldGroup>
              </form>
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
