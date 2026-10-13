"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApi } from "@/lib/use-api";

export type VoidTarget = { id: string; receiptNo: string; methods: string[] };

const PRESETS = [
  "Wrong item scanned",
  "Customer changed mind",
  "Price error",
  "Duplicate sale",
];

const REFUND_NOTE: Record<string, string> = {
  CASH: "Give the customer their cash back from the till.",
  CARD: "Refund the card payment on the card terminal.",
  MPESA:
    "M-Pesa money can't be reversed from here. It must be refunded or reversed separately.",
};

export function VoidDialog({
  target,
  onClose,
  onVoided,
}: {
  target: VoidTarget | null;
  onClose: () => void;
  onVoided: () => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>Void {target.receiptNo}?</DialogTitle>
              <DialogDescription>
                This cancels the sale and can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <VoidForm
              key={target.id}
              target={target}
              onCancel={onClose}
              onVoided={onVoided}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VoidForm({
  target,
  onCancel,
  onVoided,
}: {
  target: VoidTarget;
  onCancel: () => void;
  onVoided: () => void;
}) {
  const call = useApi();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = reason.trim().length >= 3;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await call(`/sales/${target.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast.success(`${target.receiptNo} voided. Stock restored.`);
      onVoided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not void the sale");
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
        <AlertDescription className="grid gap-1 text-foreground">
          <span>
            The items go back into stock.{" "}
            <strong>No money is returned automatically.</strong>
          </span>
          {target.methods.map((m) => (
            <span key={m}>
              {REFUND_NOTE[m] ?? `Refund the ${m} payment separately.`}
            </span>
          ))}
        </AlertDescription>
      </Alert>

      <Field>
        <FieldLabel htmlFor="void-reason">Reason</FieldLabel>
        <Input
          id="void-reason"
          autoFocus
          autoComplete="off"
          className="h-11"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESETS.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setReason(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={submitting}
          onClick={onCancel}
        >
          Keep sale
        </Button>
        <Button
          type="submit"
          variant="destructive"
          className="h-11 min-w-28"
          disabled={!valid || submitting}
          aria-busy={submitting}
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Voiding…" : "Void sale"}
        </Button>
      </div>
    </form>
  );
}
