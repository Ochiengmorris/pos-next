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
import type { ManagedProduct } from "@/lib/products/types";
import { useApi } from "@/lib/use-api";

export type StockMode = "restock" | "adjust" | "count";
export type StockAction = { mode: StockMode; product: ManagedProduct };

const TITLE: Record<StockMode, string> = {
  restock: "Restock",
  adjust: "Adjust stock",
  count: "Recount stock",
};
const DESCRIPTION: Record<StockMode, string> = {
  restock: "Add stock you have received.",
  adjust:
    "Remove or add stock for a reason, such as damage or a find. The reason is kept in the history.",
  count:
    "Enter what you actually counted on the shelf. The difference is recorded for you.",
};
const PATH: Record<StockMode, string> = {
  restock: "/inventory/restock",
  adjust: "/inventory/adjust",
  count: "/inventory/count",
};
const REASONS = {
  remove: ["Damaged", "Expired", "Lost or stolen", "Used in the shop", "Other"],
  add: ["Found", "Supplier correction", "Other"],
} as const;

export function StockActionDialog({
  action,
  onClose,
  onDone,
}: {
  action: StockAction | null;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={action !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {action && (
          <>
            <DialogHeader>
              <DialogTitle>
                {TITLE[action.mode]}: {action.product.name}
              </DialogTitle>
              <DialogDescription>{DESCRIPTION[action.mode]}</DialogDescription>
            </DialogHeader>
            <StockForm
              key={`${action.product.id}-${action.mode}`}
              {...action}
              onCancel={onClose}
              onDone={onDone}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StockForm({
  mode,
  product,
  onCancel,
  onDone,
}: StockAction & { onCancel: () => void; onDone: () => void }) {
  const call = useApi();
  const [qty, setQty] = useState("");
  const [reference, setReference] = useState(""); // restock reference or count note
  const [direction, setDirection] = useState<"remove" | "add">("remove");
  const [preset, setPreset] = useState<string>(REASONS.remove[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = product.stockQty;
  const n = /^\d+$/.test(qty) ? Number(qty) : null;
  const minQty = mode === "count" ? 0 : 1;
  const qtyValid = n !== null && n >= minQty;

  let next = current;
  if (qtyValid) {
    if (mode === "restock") next = current + n;
    else if (mode === "count") next = n;
    else next = current + (direction === "add" ? n : -n);
  }

  let problem: string | null = null;
  if (qty !== "" && !qtyValid)
    problem =
      mode === "count"
        ? "Enter a whole number, 0 or more"
        : "Enter a whole number, 1 or more";
  else if (qtyValid && next < 0) problem = `Only ${current} in stock`;

  const reasonOk =
    mode !== "adjust" || preset !== "Other" || note.trim().length >= 3;
  const canSubmit = qtyValid && next >= 0 && reasonOk && !submitting;

  function body() {
    if (mode === "restock") {
      return {
        productId: product.id,
        quantity: n,
        ...(reference.trim() && { reason: `Restock: ${reference.trim()}` }),
      };
    }
    if (mode === "count") {
      return {
        productId: product.id,
        countedQty: n,
        ...(reference.trim() && { reason: `Stock count: ${reference.trim()}` }),
      };
    }
    const reason =
      preset === "Other"
        ? note.trim()
        : `${preset}${note.trim() ? `: ${note.trim()}` : ""}`;
    return {
      productId: product.id,
      quantity: direction === "add" ? n : -(n as number),
      reason,
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await call<{ stockQty: number }>(PATH[mode], {
        method: "POST",
        body: JSON.stringify(body()),
      });
      if (mode === "count" && n === current)
        toast.info(`${product.name} matches the system. Nothing to record.`);
      else toast.success(`${product.name} stock is now ${res.stockQty}`);
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the stock",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const diff = next - current;

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="rounded-lg bg-muted p-3 text-sm">
          Current stock: <span className="font-semibold">{current}</span>
        </p>

        {mode === "adjust" && (
          <div
            role="group"
            aria-label="Direction"
            className="grid grid-cols-2 gap-2"
          >
            {(["remove", "add"] as const).map((d) => (
              <Button
                key={d}
                type="button"
                variant={direction === d ? "default" : "outline"}
                aria-pressed={direction === d}
                className="h-11"
                onClick={() => {
                  setDirection(d);
                  setPreset(REASONS[d][0]);
                }}
              >
                {d === "remove" ? "Remove stock" : "Add stock"}
              </Button>
            ))}
          </div>
        )}

        <Field data-invalid={!!problem}>
          <FieldLabel htmlFor="s-qty">
            {mode === "count"
              ? "Quantity counted"
              : mode === "restock"
                ? "Quantity received"
                : "Quantity"}
          </FieldLabel>
          <Input
            id="s-qty"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="h-12 text-lg"
            value={qty}
            onChange={(e) => setQty(e.target.value.trim())}
            aria-invalid={!!problem}
          />
          {problem && <FieldError>{problem}</FieldError>}
        </Field>

        {mode === "adjust" && (
          <>
            <Field>
              <FieldLabel htmlFor="s-reason">Reason</FieldLabel>
              <Select
                value={preset}
                onValueChange={(v) => setPreset(v ?? REASONS[direction][0])}
              >
                <SelectTrigger id="s-reason" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS[direction].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!reasonOk && note !== ""}>
              <FieldLabel htmlFor="s-note">
                {preset === "Other" ? "Describe the reason" : "Note (optional)"}
              </FieldLabel>
              <Input
                id="s-note"
                autoComplete="off"
                className="h-11"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </>
        )}

        {mode === "restock" && (
          <Field>
            <FieldLabel htmlFor="s-ref">Reference (optional)</FieldLabel>
            <Input
              id="s-ref"
              autoComplete="off"
              className="h-11"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <FieldDescription>
              For example a supplier name or invoice number.
            </FieldDescription>
          </Field>
        )}

        {mode === "count" && (
          <Field>
            <FieldLabel htmlFor="s-ref">Note (optional)</FieldLabel>
            <Input
              id="s-ref"
              autoComplete="off"
              className="h-11"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
        )}

        {qtyValid && next >= 0 && (
          <p className="text-sm font-medium" role="status">
            {mode === "count" && diff === 0
              ? "Matches the system. Nothing will change."
              : `New stock: ${next}${diff !== 0 ? ` (${diff > 0 ? "+" : ""}${diff})` : ""}`}
          </p>
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
            disabled={!canSubmit}
            aria-busy={submitting}
          >
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting ? "Saving…" : TITLE[mode]}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
