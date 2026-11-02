"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { DenominationCounter } from "@/components/cash/denomination-counter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ksh, parseAmount } from "@/lib/cash/format";
import { useApi } from "@/lib/use-api";

export function OpenShiftForm({ onOpened }: { onOpened: () => void }) {
  const call = useApi();
  const [float, setFloat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = parseAmount(float);

  async function submit() {
    if (amount === null) return;
    setBusy(true);
    setError(null);
    try {
      await call("/cash/shifts", {
        method: "POST",
        body: JSON.stringify({ openingFloat: amount }),
      });
      onOpened();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the shift");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="grid gap-4"
    >
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Field>
        <FieldLabel htmlFor="float">
          Cash in your drawer right now (opening float)
        </FieldLabel>
        <Input
          id="float"
          inputMode="decimal"
          autoFocus
          className="h-14 text-2xl tabular-nums"
          value={float}
          onChange={(e) => setFloat(e.target.value)}
          placeholder="0.00"
          autoComplete="off"
        />
      </Field>
      <DenominationCounter onTotal={(t) => setFloat(String(t))} />
      <Button type="submit" className="h-12" disabled={busy || amount === null}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {amount === null ? "Enter the float" : `Open shift with ${ksh(amount)}`}
      </Button>
    </form>
  );
}
