"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { copyText, generatePassword } from "@/lib/password";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  generate?: boolean; // offer a "generate" button (admin creating or resetting an account)
  autoComplete?: string;
};

export function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  generate = false,
  autoComplete = "new-password",
}: PasswordInputProps) {
  // a generated password starts visible so the admin can read it out or copy it
  const [visible, setVisible] = useState(generate);
  return (
    <InputGroup className="h-11 bg-background border-0">
      <InputGroupInput
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        spellCheck={false}
        className={visible ? "font-mono" : undefined}
      />
      <InputGroupAddon align="inline-end">
        {generate && (
          <InputGroupButton
            size="icon-sm"
            aria-label="Generate a new password"
            onClick={() => {
              onChange(generatePassword());
              setVisible(true);
            }}
          >
            <RefreshCw aria-hidden />
          </InputGroupButton>
        )}
        <InputGroupButton
          size="icon-sm"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

// shown once, after an account is created or a password is reset
export function Credentials({
  headline,
  email,
  password,
  onDone,
}: {
  headline: string;
  email: string;
  password: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyText(`Email: ${email}\nPassword: ${password}`)) {
      setCopied(true);
      toast.success("Copied");
    } else {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  }

  return (
    <div className="grid gap-4">
      <Alert>
        <Info aria-hidden />
        <AlertDescription className="text-foreground">
          {headline} Give these to them privately. The password won&apos;t be
          shown again, and anyone who has it can sign in.
        </AlertDescription>
      </Alert>
      <dl className="grid gap-3 rounded-lg bg-muted p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium select-all">{email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-mono text-base select-all">{password}</dd>
        </div>
      </dl>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => void copy()}
        >
          <Copy aria-hidden /> {copied ? "Copied" : "Copy both"}
        </Button>
        <Button type="button" className="h-11" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
