"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

// pending state also blocks double submits
export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  // const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-busy={pending}
      className="h-12 w-full text-base"
    >
      {pending && <Spinner />}
      {pending ? "Signing in…" : children}
    </Button>
  );
}

export function PasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <Field>
      <FieldLabel htmlFor="password">Password</FieldLabel>
      <InputGroup className="h-12 bg-background border-0">
        <InputGroupAddon>
          <Lock aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? (
              <EyeOff aria-hidden className="size-3" />
            ) : (
              <Eye aria-hidden />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
