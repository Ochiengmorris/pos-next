"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/dashboard/format";
import { formatKsh, toCents } from "@/lib/pos/money";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

export type Unclaimed = {
  id: string;
  phone: string;
  amount: string;
  receipt: string | null;
  createdAt: string;
  cashier: { id: string; name: string };
};

type Resolution = "REFUNDED" | "WRITTEN_OFF";

const CHOICES: { id: Resolution; title: string; text: string }[] = [
  {
    id: "REFUNDED",
    title: "I refunded the customer",
    text: "You returned this money to the customer yourself.",
  },
  {
    id: "WRITTEN_OFF",
    title: "Written off",
    text: "The money stays with the shop and there is no sale to attach it to. Say why in the note.",
  },
];

export function UnclaimedManager({ initial }: { initial: Unclaimed[] }) {
  const [rows, setRows] = useState(initial);
  const [target, setTarget] = useState<Unclaimed | null>(null);

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Unclaimed M-Pesa payments"
        description="Money that arrived but was never attached to a sale, for example if a till crashed after the customer paid."
      />

      {rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border bg-card py-16 text-muted-foreground">
          <CircleCheck className="size-5 text-teal-700" aria-hidden /> Nothing
          to review. Every payment is accounted for.
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <caption className="sr-only">Unclaimed M-Pesa payments</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Customer phone</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">
                  M-Pesa code
                </TableHead>
                <TableHead className="hidden md:table-cell">Cashier</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.phone}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatKsh(toCents(r.amount))}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {r.receipt ?? "Not received"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.cashier.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => setTarget(r)}
                    >
                      Resolve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ResolveDialog
        target={target}
        onClose={() => setTarget(null)}
        onResolved={(id) => {
          setRows((rs) => rs.filter((r) => r.id !== id));
          setTarget(null);
        }}
      />
    </div>
  );
}

function ResolveDialog({
  target,
  onClose,
  onResolved,
}: {
  target: Unclaimed | null;
  onClose: () => void;
  onResolved: (id: string) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>
                Resolve {formatKsh(toCents(target.amount))} from {target.phone}
              </DialogTitle>
              <DialogDescription>
                Record what happened to this money. It can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <ResolveForm
              key={target.id}
              target={target}
              onCancel={onClose}
              onResolved={onResolved}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResolveForm({
  target,
  onCancel,
  onResolved,
}: {
  target: Unclaimed;
  onCancel: () => void;
  onResolved: (id: string) => void;
}) {
  const call = useApi();
  const [choice, setChoice] = useState<Resolution | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = choice !== null && note.trim().length >= 3;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await call(`/payments/mpesa/${target.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution: choice, note: note.trim() }),
      });
      toast.success("Payment resolved");
      onResolved(target.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resolve the payment",
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

      <div role="radiogroup" aria-label="What happened" className="grid gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={choice === c.id}
            onClick={() => setChoice(c.id)}
            className={cn(
              "rounded-lg border p-3 text-left outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/50",
              choice === c.id
                ? "border-primary bg-primary/5"
                : "hover:bg-accent",
            )}
          >
            <span className="block font-medium">{c.title}</span>
            <span className="block text-sm text-muted-foreground">
              {c.text}
            </span>
          </button>
        ))}
      </div>

      <Field>
        <FieldLabel htmlFor="resolve-note">Note</FieldLabel>
        <Input
          id="resolve-note"
          autoComplete="off"
          className="h-11"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: refunded by M-Pesa reversal on 13 Oct"
        />
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
          className="h-11 min-w-28"
          disabled={!valid || submitting}
          aria-busy={submitting}
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Saving…" : "Resolve"}
        </Button>
      </div>
    </form>
  );
}
