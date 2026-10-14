"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { generatePassword } from "@/lib/password";
import {
  ROLE_HELP,
  ROLE_LABEL,
  type StaffRole,
  type StaffUser,
} from "@/lib/staff/types";
import { useApi } from "@/lib/use-api";
import { Credentials, PasswordInput } from "./password-tools";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StaffUser | null; // null = add
  isSelf: boolean;
  onSaved: () => void;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StaffFormDialog({
  open,
  onOpenChange,
  user,
  isSelf,
  onSaved,
}: Props) {
  const [created, setCreated] = useState<{
    email: string;
    password: string;
  } | null>(null);

  return (
    <Dialog
      open={open}
      // the one-time password must be copied before this can close
      onOpenChange={(o) => {
        if (!o && created) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {created
              ? "Staff member added"
              : user
                ? "Edit staff member"
                : "Add staff member"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Their account is ready."
              : user
                ? "Changes apply the next time they use the app."
                : "They sign in with the email and password below."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <Credentials
            headline="The account was created."
            email={created.email}
            password={created.password}
            onDone={() => {
              setCreated(null);
              onSaved();
            }}
          />
        ) : (
          <StaffForm
            key={user?.id ?? "new"}
            user={user}
            isSelf={isSelf}
            onCancel={() => onOpenChange(false)}
            onEdited={onSaved}
            onCreated={setCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StaffForm({
  user,
  isSelf,
  onCancel,
  onEdited,
  onCreated,
}: {
  user: StaffUser | null;
  isSelf: boolean;
  onCancel: () => void;
  onEdited: () => void;
  onCreated: (c: { email: string; password: string }) => void;
}) {
  const call = useApi();
  const isEdit = user !== null;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<StaffRole>(user?.role ?? "CASHIER");
  const [password, setPassword] = useState(() =>
    isEdit ? "" : generatePassword(),
  );
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (name.trim().length < 2) found.name = "Enter their name";
    if (!EMAIL.test(email.trim())) found.email = "Enter a valid email address";
    if (!isEdit && password.length < 8)
      found.password = "Use at least 8 characters";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (isEdit) {
        await call(`/users/${user.id}`, {
          method: "PATCH",
          // your own role can't be changed (the server refuses it too)
          body: JSON.stringify({
            name: name.trim(),
            email: cleanEmail,
            ...(isSelf ? {} : { role }),
          }),
        });
        toast.success("Changes saved");
        onEdited();
      } else {
        await call("/users", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: cleanEmail,
            password,
            role,
          }),
        });
        onCreated({ email: cleanEmail, password });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409)
        setErrors({ email: err.message });
      else
        setServerError(err instanceof Error ? err.message : "Could not save");
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

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="st-name">Full name</FieldLabel>
          <Input
            id="st-name"
            autoComplete="off"
            autoFocus
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="st-email">Email</FieldLabel>
          <Input
            id="st-email"
            type="email"
            autoComplete="off"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="st-role">Role</FieldLabel>
          <Select
            value={role}
            onValueChange={(v) => setRole((v as StaffRole) ?? "CASHIER")}
            disabled={isSelf}
          >
            <SelectTrigger id="st-role" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {isSelf ? "You can't change your own role." : ROLE_HELP[role]}
          </FieldDescription>
        </Field>

        {!isEdit && (
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="st-password">Temporary password</FieldLabel>
            <PasswordInput
              id="st-password"
              value={password}
              onChange={setPassword}
              invalid={!!errors.password}
              generate
            />
            <FieldDescription>
              Generated for you. They can change it themselves from the user
              menu.
            </FieldDescription>
            {errors.password && <FieldError>{errors.password}</FieldError>}
          </Field>
        )}

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
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add staff member"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
