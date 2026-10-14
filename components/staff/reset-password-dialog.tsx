"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { generatePassword } from "@/lib/password";
import type { StaffUser } from "@/lib/staff/types";
import { useApi } from "@/lib/use-api";
import { Credentials, PasswordInput } from "./password-tools";

export function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: StaffUser | null;
  onClose: () => void;
}) {
  const [done, setDone] = useState<string | null>(null); // the new password, once saved

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(o) => {
        if (!o && done) return; // copy the new password first
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {user && (
          <>
            <DialogHeader>
              <DialogTitle>Reset password for {user.name}</DialogTitle>
              <DialogDescription>
                {done
                  ? "The new password is set."
                  : "Choose a new password for them."}
              </DialogDescription>
            </DialogHeader>
            {done ? (
              <Credentials
                headline={`${user.name}'s password was reset.`}
                email={user.email}
                password={done}
                onDone={() => {
                  setDone(null);
                  onClose();
                }}
              />
            ) : (
              <ResetForm
                key={user.id}
                user={user}
                onCancel={onClose}
                onDone={setDone}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResetForm({
  user,
  onCancel,
  onDone,
}: {
  user: StaffUser;
  onCancel: () => void;
  onDone: (password: string) => void;
}) {
  const call = useApi();
  const [password, setPassword] = useState(() => generatePassword());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tooShort = password.length < 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (tooShort || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await call(`/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword: password }),
      });
      onDone(password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset the password",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Alert>
        <Info aria-hidden />
        <AlertDescription className="text-foreground">
          If they are signed in right now, they stay signed in until their
          session ends (up to 12 hours). To cut off access immediately,
          deactivate the account instead.
        </AlertDescription>
      </Alert>
      <Field data-invalid={tooShort}>
        <FieldLabel htmlFor="rp-password">New password</FieldLabel>
        <PasswordInput
          id="rp-password"
          value={password}
          onChange={setPassword}
          invalid={tooShort}
          generate
        />
        {tooShort && <FieldError>Use at least 8 characters</FieldError>}
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-11 min-w-32"
          disabled={tooShort || submitting}
          aria-busy={submitting}
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Saving…" : "Reset password"}
        </Button>
      </div>
    </form>
  );
}
