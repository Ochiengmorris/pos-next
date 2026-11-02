"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOVEMENT_LABEL, cents, ksh, parseAmount } from "@/lib/cash/format";
import type { MovementType } from "@/lib/cash/types";
import { useApi } from "@/lib/use-api";

type Props = {
  shiftId: string;
  open: boolean;
  initialType: MovementType;
  types: MovementType[]; // what this person may record
  inDrawer: string; // what the drawer should hold now
  paidOutLimit: number;
  limited: boolean; // true for a cashier: paid-outs above the limit need a manager
  onClose: () => void;
  onDone: () => void;
};

export function MovementDialog({
  shiftId,
  open,
  initialType,
  types,
  inDrawer,
  paidOutLimit,
  limited,
  onClose,
  onDone,
}: Props) {
  const call = useApi();
  const [type, setType] = useState<MovementType>(initialType);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setAmount("");
      setReason("");
      setError(null);
      setBusy(false);
    }
  }, [open, initialType]);

  const n = parseAmount(amount);
  const overDrawer =
    type !== "CASH_IN" && n !== null && cents(n) > cents(Number(inDrawer));
  const overLimit =
    type === "PAID_OUT" && limited && n !== null && n > paidOutLimit;
  const needsReason = type !== "CASH_DROP";
  const ok =
    n !== null &&
    n > 0 &&
    !overDrawer &&
    !overLimit &&
    (!needsReason || reason.trim().length >= 3);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await call(`/cash/shifts/${shiftId}/movements`, {
        method: "POST",
        body: JSON.stringify({
          type,
          amount: n,
          reason: reason.trim() || undefined,
        }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record it");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{MOVEMENT_LABEL[type]}</DialogTitle>
          <DialogDescription>
            The drawer should hold {ksh(inDrawer)} now.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {types.length > 1 && (
          <Field>
            <FieldLabel>What happened?</FieldLabel>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as MovementType)}
            >
              <SelectTrigger className="h-11" aria-label="Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MOVEMENT_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="mv-amount">Amount</FieldLabel>
          <Input
            id="mv-amount"
            inputMode="decimal"
            autoFocus
            className="h-12 text-lg tabular-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoComplete="off"
          />
          {overDrawer && (
            <p className="text-sm text-red-700">
              That is more than the drawer should hold.
            </p>
          )}
          {overLimit && (
            <p className="text-sm text-red-700">
              Paid-outs above {ksh(paidOutLimit)} need a manager. Ask one to
              record it.
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="mv-reason">
            {type === "CASH_DROP" ? "Note (optional)" : "Reason"}
          </FieldLabel>
          <Input
            id="mv-reason"
            className="h-11"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              type === "PAID_OUT"
                ? "e.g. Ice delivery, cleaner's pay"
                : type === "CASH_DROP"
                  ? "e.g. Drop to safe"
                  : "e.g. Float top-up"
            }
            maxLength={150}
            autoComplete="off"
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={!ok || busy}
            onClick={() => void submit()}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />} Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
