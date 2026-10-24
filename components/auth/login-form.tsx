"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { login } from "@/app/login/actions";
import { PasswordField, SubmitButton } from "@/components/auth/login-controls";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export function LoginForm({
  callbackUrl,
  sessionExpired,
}: {
  callbackUrl: string;
  sessionExpired?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (sessionExpired)
      toast.info("Your session expired. Please sign in again.", {
        id: "expired",
      });
  }, [sessionExpired]);

  function action(formData: FormData) {
    startTransition(async () => {
      const res = await login(formData);
      if (res.ok) {
        toast.success("Signed in successfully");
        router.replace(res.redirectTo);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <form action={action}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <InputGroup className="h-12 border-0 bg-background">
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
            />
          </InputGroup>
        </Field>
        <PasswordField />
        <Field>
          <SubmitButton pending={pending}>Sign in</SubmitButton>
        </Field>
      </FieldGroup>
    </form>
  );
}
