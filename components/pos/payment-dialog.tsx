"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock, X } from "lucide-react";
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
import { useMpesaPayment } from "@/hooks/use-mpesa-payment";
import { centsToInput, formatKsh, parseCents } from "@/lib/pos/money";
import type { PaymentEntry } from "@/lib/pos/types";
import { MpesaPane } from "./mpesa-pane";

type Method = "CASH" | "CARD" | "MPESA";
type Draft = Omit<PaymentEntry, "id">;

const LABEL: Record<Method, string> = {
  CASH: "Cash",
  CARD: "Card",
  MPESA: "M-Pesa",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCents: number;
  /**
   * `idempotencyKey` is the same for every retry of one sale. The server must
   * return the original sale if it has already seen the key, and must verify
   * each `mpesaPaymentId` (exists, unclaimed, amount matches) itself.
   */
  onSubmit: (entries: PaymentEntry[], idempotencyKey: string) => Promise<void>;
};

// Round-ups above what is owed, for "customer gave a big note" (values in cents).
const NOTE_STEPS = [5000, 10000, 20000, 50000, 100000];

function quickAmounts(remaining: number): number[] {
  if (remaining <= 0) return [];
  const set = new Set<number>([remaining]);
  for (const s of NOTE_STEPS) set.add(Math.ceil(remaining / s) * s);
  return [...set].sort((a, b) => a - b).slice(0, 4);
}

function totalPaid(entries: PaymentEntry[]): number {
  return entries.reduce((s, e) => s + e.amountCents, 0);
}

// crypto.randomUUID only exists in secure contexts (https / localhost);
// a POS served over plain http on a LAN needs the fallback.
function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Remounts the whole session each time the dialog opens, so every piece of
 * state (entries, inputs, M-Pesa hook, idempotency key) starts fresh by
 * construction instead of being reset by effects.
 */
export function PaymentDialog(props: Props) {
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((s) => s + 1);
  }
  return <PaymentSession key={session} {...props} />;
}

function PaymentSession({ open, onOpenChange, totalCents, onSubmit }: Props) {
  const mpesa = useMpesaPayment();
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [method, setMethod] = useState<Method>("CASH");
  const [cash, setCash] = useState(() => centsToInput(totalCents));
  const [cardAmount, setCardAmount] = useState(() => centsToInput(totalCents));
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const cashRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const handledPaid = useRef<string | null>(null);
  // Mirrors of state for code that must see the latest value synchronously
  const entriesRef = useRef<PaymentEntry[]>([]);
  const submittingRef = useRef(false);
  // Created on the first submit attempt, reused by every retry of this sale
  const saleKey = useRef<string | null>(null);

  const paidCents = totalPaid(entries);
  const remaining = totalCents - paidCents;
  const fullyPaid = entries.length > 0 && remaining <= 0;
  const hasMpesaEntry = entries.some((e) => e.method === "MPESA");
  const phase = mpesa.state.phase;
  const mpesaBusy =
    phase === "sending" || phase === "waiting" || phase === "paid";
  // While a request is in flight or its money is in hand, the dialog cannot be dismissed
  const locked = hasMpesaEntry || mpesaBusy;

  // Single place that changes the entry list, so the ref, the state and the
  // prefilled amounts can never drift apart.
  function applyEntries(next: PaymentEntry[]) {
    entriesRef.current = next;
    setEntries(next);
    const left = Math.max(totalCents - totalPaid(next), 0);
    setCash(centsToInput(left));
    setCardAmount(centsToInput(left));
  }

  // Focus the cash field whenever it is the active input
  useEffect(() => {
    if (!open || method !== "CASH" || fullyPaid) return;
    const t = setTimeout(() => {
      cashRef.current?.focus();
      cashRef.current?.select();
    }, 60);
    return () => clearTimeout(t);
  }, [open, method, remaining, fullyPaid]);

  // Refreshing or closing the tab while money is in flight would lose track of it: ask first
  useEffect(() => {
    if (!locked) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // required by Safari and older browsers
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [locked]);

  // A stray earlier tap must not leave "Tap again to leave" armed forever
  useEffect(() => {
    if (!confirmLeave) return;
    const t = setTimeout(() => setConfirmLeave(false), 4000);
    return () => clearTimeout(t);
  }, [confirmLeave]);

  // The customer approved on their phone: record it and, if it covers the bill, finish the sale
  useEffect(() => {
    const s = mpesa.state;
    if (s.phase !== "paid" || handledPaid.current === s.id) return;
    handledPaid.current = s.id;
    const entry: PaymentEntry = {
      id: String(nextId.current++),
      method: "MPESA",
      amountCents: s.amountCents,
      reference: s.receipt ?? undefined,
      mpesaPaymentId: s.id,
    };
    mpesa.reset();
    void commit(entry);
    // `commit` only reads refs and props from this render; handledPaid makes this run once per payment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpesa.state]);

  const draft = useMemo((): {
    entry?: Draft;
    change?: number;
    problem?: string;
  } => {
    if (remaining <= 0) return { problem: "Nothing left to pay" };
    if (method === "CASH") {
      const received = parseCents(cash);
      if (!received || received <= 0)
        return { problem: "Enter the cash received" };
      const applied = Math.min(received, remaining);
      return {
        entry: {
          method: "CASH",
          amountCents: applied,
          tenderedCents: received,
        },
        change: received - applied,
      };
    }
    if (method === "CARD") {
      const amount = parseCents(cardAmount);
      if (!amount || amount <= 0) return { problem: "Enter the card amount" };
      if (amount > remaining)
        return {
          problem: `The card amount can't be more than ${formatKsh(remaining)}`,
        };
      if (reference.trim().length < 4)
        return { problem: "Enter the card slip or approval reference" };
      return {
        entry: {
          method: "CARD",
          amountCents: amount,
          reference: reference.trim(),
        },
      };
    }
    return {};
  }, [method, cash, cardAmount, reference, remaining]);

  const covers = draft.entry ? draft.entry.amountCents >= remaining : false;

  async function submitAll(all: PaymentEntry[]) {
    // A ref, not state: two triggers in the same tick must not both get through
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    saleKey.current ??= newKey();
    try {
      await onSubmit(all, saleKey.current);
      // Sale is done. If the parent keeps this dialog open, the next sale gets a new key.
      saleKey.current = null;
      applyEntries([]);
      mpesa.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete the sale");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // Entries are stored before submitting, so a failed submit can simply be retried
  async function commit(entry: PaymentEntry) {
    const all = [...entriesRef.current, entry];
    applyEntries(all);
    setReference("");
    if (totalPaid(all) >= totalCents) await submitAll(all);
  }

  function charge() {
    if (!draft.entry || submittingRef.current) return;
    void commit({ ...draft.entry, id: String(nextId.current++) });
  }

  function leaveWithoutCompleting() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    saleKey.current = null;
    applyEntries([]);
    setError(null);
    setConfirmLeave(false);
    mpesa.reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !submitting && !locked && onOpenChange(o)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Sale total {formatKsh(totalCents)}
            {paidCents > 0 && ` · Paid ${formatKsh(paidCents)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">Amount due</p>
          <p className="text-4xl font-semibold tabular-nums">
            {formatKsh(Math.max(remaining, 0))}
          </p>
        </div>

        {entries.length > 0 && (
          <ul className="grid gap-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {LABEL[e.method]}
                  {e.reference ? ` · ${e.reference}` : ""}
                </span>
                <span className="flex items-center gap-1 font-medium tabular-nums">
                  {formatKsh(e.amountCents)}
                  {e.method === "MPESA" ? (
                    <span
                      className="grid size-8 place-items-center text-muted-foreground"
                      title="Received, cannot be removed"
                    >
                      <Lock
                        className="size-4"
                        aria-label="Received, cannot be removed"
                      />
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={submitting}
                      aria-label={`Remove ${LABEL[e.method]} payment`}
                      onClick={() =>
                        applyEntries(
                          entriesRef.current.filter((x) => x.id !== e.id),
                        )
                      }
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {fullyPaid ? (
          <p className="rounded-lg border p-3 text-sm" role="status">
            Payment received in full. Complete the sale to finish.
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Payment method"
              className="grid grid-cols-3 gap-2"
            >
              {(Object.keys(LABEL) as Method[]).map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={method === m ? "default" : "outline"}
                  aria-pressed={method === m}
                  className="h-11"
                  disabled={mpesaBusy}
                  onClick={() => {
                    setMethod(m);
                    mpesa.reset();
                  }}
                >
                  {LABEL[m]}
                </Button>
              ))}
            </div>

            {method === "MPESA" ? (
              <MpesaPane mpesa={mpesa} remainingCents={remaining} />
            ) : (
              <form
                id="payment-form"
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  charge();
                }}
              >
                {method === "CASH" ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="cash">
                        Cash received (KSh)
                      </FieldLabel>
                      <Input
                        id="cash"
                        ref={cashRef}
                        inputMode="decimal"
                        autoComplete="off"
                        value={cash}
                        onChange={(e) => setCash(e.target.value)}
                        className="h-12 text-lg"
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts(remaining).map((c) => (
                        <Button
                          key={c}
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={() => setCash(centsToInput(c))}
                        >
                          {c === remaining ? "Exact" : formatKsh(c)}
                        </Button>
                      ))}
                    </div>
                    {draft.change !== undefined && draft.change > 0 && (
                      <p className="text-lg font-semibold" role="status">
                        Change to give: {formatKsh(draft.change)}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Field>
                      <FieldLabel htmlFor="card-amount">
                        Amount (KSh)
                      </FieldLabel>
                      <Input
                        id="card-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        className="h-12 text-lg"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="card-ref">
                        Slip or approval reference
                      </FieldLabel>
                      <Input
                        id="card-ref"
                        autoComplete="off"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="h-12"
                      />
                    </Field>
                  </>
                )}
              </form>
            )}
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {error && hasMpesaEntry && (
          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <p>
              The M-Pesa payment was received, but the sale couldn&apos;t be
              completed. Fix the problem and try again, or leave and ask a
              manager to reassign the payment from Unclaimed payments.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-self-start"
              onClick={leaveWithoutCompleting}
            >
              {confirmLeave ? "Tap again to leave" : "Leave without completing"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={submitting || locked}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {fullyPaid ? (
            <Button
              type="button"
              className="h-11 min-w-40"
              disabled={submitting}
              aria-busy={submitting}
              onClick={() => void submitAll(entriesRef.current)}
            >
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "Processing…" : "Complete sale"}
            </Button>
          ) : method !== "MPESA" ? (
            <Button
              type="submit"
              form="payment-form"
              className="h-11 min-w-40"
              disabled={!draft.entry || submitting}
              aria-busy={submitting}
            >
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting
                ? "Processing…"
                : covers
                  ? "Complete sale"
                  : "Add payment"}
            </Button>
          ) : null}
        </DialogFooter>

        {locked ? (
          <p className="text-center text-xs text-muted-foreground">
            An M-Pesa payment is in progress or received. Complete the sale to
            close this window.
          </p>
        ) : (
          !draft.entry &&
          method !== "MPESA" &&
          draft.problem && (
            <p className="text-center text-xs text-muted-foreground">
              {draft.problem}
            </p>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
