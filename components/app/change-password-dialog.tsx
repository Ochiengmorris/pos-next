"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/staff/password-tools";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change your password</DialogTitle>
          <DialogDescription>
            Use at least 8 characters. You stay signed in.
          </DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ChangePasswordForm({
  onDone,
  onCancel,
}: {
  onDone: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const call = useApi();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = "Enter your current password";
    if (next.length < 8) found.next = "Use at least 8 characters";
    else if (next === current) found.next = "Choose a different password";
    if (confirm !== next) found.confirm = "The two passwords don't match";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await call("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      toast.success("Password changed");
      await onDone();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.message.toLowerCase().includes("current password")
      )
        setErrors({ current: err.message });
      else
        setServerError(
          err instanceof Error ? err.message : "Could not change the password",
        );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!errors.current}>
          <FieldLabel htmlFor="cp-current">Current password</FieldLabel>
          <PasswordInput
            id="cp-current"
            value={current}
            onChange={setCurrent}
            invalid={!!errors.current}
            autoComplete="current-password"
          />
          {errors.current && <FieldError>{errors.current}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.next}>
          <FieldLabel htmlFor="cp-new">New password</FieldLabel>
          <PasswordInput
            id="cp-new"
            value={next}
            onChange={setNext}
            invalid={!!errors.next}
          />
          {errors.next && <FieldError>{errors.next}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="cp-confirm">Repeat the new password</FieldLabel>
          <PasswordInput
            id="cp-confirm"
            value={confirm}
            onChange={setConfirm}
            invalid={!!errors.confirm}
          />
          {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="h-11 min-w-36"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting ? "Saving…" : "Change password"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
