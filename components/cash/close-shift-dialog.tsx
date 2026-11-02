"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { DenominationCounter } from "@/components/cash/denomination-counter";
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
import { cents, ksh, parseAmount } from "@/lib/cash/format";
import type { ShiftView } from "@/lib/cash/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

type Props = {
  shift: ShiftView;
  open: boolean;
  onBehalf: boolean;
  onClose: () => void;
  onClosed: (s: ShiftView) => void;
};

export function CloseShiftDialog({
  shift,
  open,
  onBehalf,
  onClose,
  onClosed,
}: Props) {
  const call = useApi();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCounted("");
      setNote("");
      setArmed(false);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const expected = shift.figures.expectedCash;
  const n = parseAmount(counted);
  const diff = n === null ? null : (cents(n) - cents(Number(expected))) / 100;
  const big = diff !== null && Math.abs(diff) > shift.tolerance;
  const needNote = big || onBehalf;
  const ok = n !== null && (!needNote || note.trim().length >= 5);

  async function close() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onClosed(
        await call<ShiftView>(`/cash/shifts/${shift.id}/close`, {
          method: "POST",
          body: JSON.stringify({
            countedCash: n,
            note: note.trim() || undefined,
          }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close the shift");
      setArmed(false);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {onBehalf
              ? `Close ${shift.cashierName}'s shift`
              : "Close your shift"}
          </DialogTitle>
          <DialogDescription>
            Count the cash in the drawer and enter it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            The drawer should hold
          </p>
          <p className="text-3xl font-semibold tabular-nums">{ksh(expected)}</p>
          <p className="text-xs text-muted-foreground">
            {ksh(shift.figures.openingFloat)} float +{" "}
            {ksh(shift.figures.cashSales)} cash sales
            {Number(shift.figures.cashIn) > 0 &&
              ` + ${ksh(shift.figures.cashIn)} added`}{" "}
            − {ksh(shift.figures.paidOut)} paid out −{" "}
            {ksh(shift.figures.cashDrops)} dropped
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="counted">Cash you counted</FieldLabel>
          <Input
            id="counted"
            inputMode="decimal"
            autoFocus
            className="h-14 text-2xl tabular-nums"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder="0.00"
            autoComplete="off"
          />
        </Field>
        <DenominationCounter onTotal={(t) => setCounted(String(t))} />

        {diff !== null && (
          <p
            role="status"
            className={cn(
              "text-sm font-semibold",
              diff === 0
                ? "text-teal-700"
                : big
                  ? "text-red-700"
                  : "text-amber-700",
            )}
          >
            {diff === 0
              ? "Exact. The drawer matches."
              : diff < 0
                ? `Short by ${ksh(-diff)}`
                : `Over by ${ksh(diff)}`}
          </p>
        )}
        {needNote && (
          <Field>
            <FieldLabel htmlFor="close-note">
              {onBehalf
                ? "Why are you closing this shift for the cashier?"
                : "Please explain the difference"}
            </FieldLabel>
            <Input
              id="close-note"
              className="h-11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={250}
              autoComplete="off"
            />
          </Field>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onClose}
            disabled={busy}
          >
            Back
          </Button>
          <Button
            type="button"
            className="h-11"
            variant={armed ? "destructive" : "default"}
            disabled={!ok || busy}
            onClick={() => void close()}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {armed ? "Tap again to close the shift" : "Close shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
