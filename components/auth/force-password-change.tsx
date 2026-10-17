"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChangePasswordForm } from "@/components/app/change-password-dialog";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ForcePasswordChange() {
  const { update } = useSession();
  const router = useRouter();

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle role="heading" aria-level={1} className="text-2xl">
              Choose your own password
            </CardTitle>
            <CardDescription>
              You signed in with a temporary password. Set a new one to
              continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm
              onDone={async () => {
                await update({ mustChangePassword: false }); // refresh the session cookie
                router.replace("/");
                router.refresh();
              }}
            />
          </CardContent>
          <CardFooter className="justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => signOut({ redirectTo: "/login" })}
            >
              Sign out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
