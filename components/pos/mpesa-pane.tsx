"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { MpesaController } from "@/hooks/use-mpesa-payment";
import { formatKsh } from "@/lib/pos/money";
import { InputGroup, InputGroupInput } from "../ui/input-group";

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function MpesaPane({
  mpesa,
  remainingCents,
}: {
  mpesa: MpesaController;
  remainingCents: number;
}) {
  const { state, elapsed } = mpesa;
  const maxShillings = Math.floor(remainingCents / 100);
  const [phone, setPhone] = useState("");
  const [amountState, setAmountState] = useState({
    maxShillings,
    value: String(maxShillings),
  });
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  if (amountState.maxShillings !== maxShillings) {
    setAmountState({ maxShillings, value: String(maxShillings) });
  }
  const amount = amountState.value;

  const amountNum = Number(amount);
  const amountOk =
    Number.isInteger(amountNum) && amountNum >= 1 && amountNum <= maxShillings;
  const phoneOk = phone.replace(/\D/g, "").length >= 9;

  if (state.phase === "sending") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        role="status"
      >
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <p className="font-medium">Sending the request…</p>
      </div>
    );
  }

  if (state.phase === "paid") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        role="status"
      >
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <p className="font-medium">Payment received. Completing the sale…</p>
      </div>
    );
  }

  if (state.phase === "waiting") {
    return (
      <div className="grid gap-4 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Loader2
            className="mt-0.5 size-5 shrink-0 animate-spin"
            aria-hidden
          />
          <div className="grid gap-1">
            <p className="font-semibold" role="status">
              Waiting for the customer…
            </p>
            <p className="text-sm text-muted-foreground">
              A request for {formatKsh(state.amountCents)} was sent to{" "}
              {state.phone}. Ask them to enter their M-Pesa PIN.
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              Elapsed {clock(elapsed)}
            </p>
          </div>
        </div>

        {elapsed >= 45 && (
          <p className="text-sm">
            Taking longer than usual. If the customer says they have paid, tap
            “Check now”.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => void mpesa.checkNow()}
          >
            Check now
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => setConfirmAbandon(true)}
          >
            Use another method
          </Button>
        </div>

        {confirmAbandon && (
          <div className="grid gap-2 rounded-lg bg-muted p-3 text-sm">
            <p>
              If the customer pays anyway, the money will show under Unclaimed
              payments for a manager to sort out. Stop waiting?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => {
                  setConfirmAbandon(false);
                  mpesa.reset();
                }}
              >
                Yes, stop waiting
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-9"
                onClick={() => setConfirmAbandon(false)}
              >
                Keep waiting
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // idle or failed: the request form
  if (maxShillings < 1) {
    return (
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        Less than KSh 1 left to pay. Use cash or card.
      </p>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (phoneOk && amountOk) void mpesa.start(phone, amountNum * 100);
      }}
    >
      {state.phase === "failed" && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Field>
        <FieldLabel htmlFor="mpesa-phone">Customer phone</FieldLabel>
        <InputGroup className="h-11">
          <InputGroupInput
            id="mpesa-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="0712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 text-lg"
          />
        </InputGroup>
      </Field>

      <Field>
        <FieldLabel htmlFor="mpesa-amount">
          Amount (KSh, whole shillings)
        </FieldLabel>
        <InputGroup className="h-11">
          <InputGroupInput
            id="mpesa-amount"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) =>
              setAmountState({
                maxShillings,
                value: e.target.value.replace(/\D/g, ""),
              })
            }
            className="h-12 text-lg"
          />
        </InputGroup>
      </Field>

      {remainingCents % 100 !== 0 && (
        <p className="text-xs text-muted-foreground">
          M-Pesa takes whole shillings. Collect the remaining{" "}
          {formatKsh(remainingCents - maxShillings * 100)} by cash or card.
        </p>
      )}

      <Button type="submit" className="h-11" disabled={!phoneOk || !amountOk}>
        <Smartphone aria-hidden />
        {state.phase === "failed"
          ? "Send a new request"
          : "Send M-Pesa request"}
      </Button>
    </form>
  );
}
