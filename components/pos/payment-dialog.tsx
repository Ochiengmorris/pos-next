"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
  X,
  type LucideIcon,
} from "lucide-react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMpesaPayment } from "@/hooks/use-mpesa-payment";
import { centsToInput, formatKsh, parseCents } from "@/lib/pos/money";
import type { PaymentEntry } from "@/lib/pos/types";
import { MpesaPane } from "./mpesa-pane";

type Method = "CASH" | "MPESA" | "CARD";
type Draft = Omit<PaymentEntry, "id">;

/** Flip to true when card payments are ready; the card form below is already wired. */
const CARD_ENABLED = false;

const METHOD_META: Record<
  Method,
  { label: string; icon: LucideIcon; enabled: boolean }
> = {
  CASH: { label: "Cash", icon: Banknote, enabled: true },
  MPESA: { label: "M-Pesa", icon: Smartphone, enabled: true },
  CARD: { label: "Card", icon: CreditCard, enabled: CARD_ENABLED },
};

const METHODS = Object.keys(METHOD_META) as Method[];

/** Filled, borderless look for dialog inputs; a visible border appears on focus. */
export const INPUT_CLASS =
  "h-14 bg-background pl-4 focus-visible:border-ring border border-transparent focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-0";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCents: number;
  /**
   * `idempotencyKey` is the same for every retry of one sale. The server must
   * return the original sale if it has already seen the key, and must verify
   * each `mpesaPaymentId` (exists, unclaimed, amount matches) itself.
   */
  onSubmit: (
    entries: PaymentEntry[],
    idempotencyKey: string,
    customer?: { pin: string; name?: string },
  ) => Promise<void>;
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

/** Digits and at most one decimal point with two decimals, so "12a.5.5" can't be typed. */
function sanitizeMoney(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
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

// -----------------------------------------------------------------------------
// Presentational pieces
// -----------------------------------------------------------------------------

function AmountDue({
  totalCents,
  paidCents,
  remaining,
}: {
  totalCents: number;
  paidCents: number;
  remaining: number;
}) {
  const pct =
    totalCents > 0
      ? Math.min(100, Math.round((paidCents / totalCents) * 100))
      : 0;

  return (
    <div
      className="rounded-xl bg-muted p-4 text-center shadow-2xl border border-card/10"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Amount due</p>
      <p className="text-4xl font-bold tabular-nums sm:text-5xl">
        {formatKsh(Math.max(remaining, 0))}
      </p>
      {paidCents > 0 && (
        <div className="mt-3 grid gap-1.5">
          <div
            className="h-2 overflow-hidden rounded-full bg-background"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Share of the sale paid"
          >
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatKsh(paidCents)} paid of {formatKsh(totalCents)}
          </p>
        </div>
      )}
    </div>
  );
}

function EntryList({
  entries,
  disabled,
  onRemove,
}: {
  entries: PaymentEntry[];
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <ul className="grid gap-2" aria-label="Payments added">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
        >
          <span className="truncate">
            {METHOD_META[e.method].label}
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
                disabled={disabled}
                aria-label={`Remove ${METHOD_META[e.method].label} payment`}
                onClick={() => onRemove(e.id)}
              >
                <X aria-hidden />
              </Button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PinSection({
  open,
  pin,
  name,
  problem,
  disabled,
  onOpen,
  onPinChange,
  onNameChange,
  onRemove,
}: {
  open: boolean;
  pin: string;
  name: string;
  problem: string | null;
  disabled: boolean;
  onOpen: () => void;
  onPinChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onRemove: () => void;
}) {
  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-10 justify-self-start"
        onClick={onOpen}
        disabled={disabled}
      >
        Business customer? Add their KRA PIN
      </Button>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border-card shadow-2xl bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Business customer</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </Button>
      </div>
      <Field data-invalid={!!problem}>
        <FieldLabel htmlFor="cust-pin">Customer KRA PIN</FieldLabel>
        <Input
          id="cust-pin"
          value={pin}
          onChange={(e) => onPinChange(e.target.value.toUpperCase().trim())}
          maxLength={11}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          placeholder="A123456789Z"
          className={`${INPUT_CLASS} font-mono`}
          aria-invalid={!!problem}
          disabled={disabled}
        />
        {problem && <FieldError>{problem}</FieldError>}
      </Field>
      <Field>
        <FieldLabel htmlFor="cust-name">Customer name (optional)</FieldLabel>
        <Input
          id="cust-name"
          value={name}
          maxLength={60}
          autoComplete="off"
          className={INPUT_CLASS}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

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

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinName, setPinName] = useState("");
  const pinProblem =
    pin !== "" && !/^[AP]\d{9}[A-Z]$/.test(pin)
      ? "A KRA PIN looks like A123456789Z"
      : null;

  const paidCents = totalPaid(entries);
  const remaining = totalCents - paidCents;
  const fullyPaid = entries.length > 0 && remaining <= 0;
  const hasMpesaEntry = entries.some((e) => e.method === "MPESA");
  const phase = mpesa.state.phase;
  const mpesaBusy =
    phase === "sending" || phase === "waiting" || phase === "paid";
  // While a request is in flight or its money is in hand, the dialog cannot be dismissed
  const locked = hasMpesaEntry || mpesaBusy;

  const draft = useMemo((): {
    entry?: Draft;
    change?: number;
    leftAfter?: number;
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
        leftAfter: remaining - applied,
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
        leftAfter: remaining - amount,
      };
    }
    return {};
  }, [method, cash, cardAmount, reference, remaining]);

  const covers = draft.entry ? draft.entry.amountCents >= remaining : false;
  const cashTendered =
    draft.entry?.method === "CASH" ? draft.entry.tenderedCents : undefined;

  // ---------------------------------------------------------------------------
  // Actions. These are declared BEFORE any effect that calls them.
  // ---------------------------------------------------------------------------

  // Single place that changes the entry list, so the ref, the state and the
  // prefilled amounts can never drift apart.
  const applyEntries = useCallback(
    (next: PaymentEntry[]) => {
      entriesRef.current = next;
      setEntries(next);
      const left = Math.max(totalCents - totalPaid(next), 0);
      setCash(centsToInput(left));
      setCardAmount(centsToInput(left));
    },
    [totalCents],
  );

  const submitAll = useCallback(
    async (all: PaymentEntry[]) => {
      // An M-Pesa payment can finish the sale on its own, so the PIN must be
      // checked here too, not only by the disabled buttons.
      if (pinProblem) {
        setShowPin(true);
        setError(
          "Fix the customer's KRA PIN, or remove it, to complete the sale.",
        );
        return;
      }
      // A ref, not state: two triggers in the same tick must not both get through
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      saleKey.current ??= newKey();
      try {
        await onSubmit(
          all,
          saleKey.current,
          pin ? { pin, name: pinName.trim() || undefined } : undefined,
        );
        // Sale is done. If the parent keeps this dialog open, the next sale gets a new key.
        saleKey.current = null;
        applyEntries([]);
        mpesa.reset();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not complete the sale",
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [applyEntries, mpesa, onSubmit, pin, pinName, pinProblem],
  );

  // Entries are stored before submitting, so a failed submit can simply be retried
  const commit = useCallback(
    async (entry: PaymentEntry) => {
      const all = [...entriesRef.current, entry];
      applyEntries(all);
      setReference("");
      if (totalPaid(all) >= totalCents) await submitAll(all);
    },
    [applyEntries, submitAll, totalCents],
  );

  function charge() {
    if (!draft.entry || submittingRef.current) return;
    void commit({ ...draft.entry, id: String(nextId.current++) });
  }

  function removeEntry(id: string) {
    applyEntries(entriesRef.current.filter((x) => x.id !== id));
  }

  function removePin() {
    setPin("");
    setPinName("");
    setShowPin(false);
    setError(null);
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

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // The customer approved on their phone: record it and, if it covers the bill,
  // finish the sale. Runs after `commit` is declared, and `handledPaid` makes
  // sure each payment is recorded exactly once even if this effect re-runs.
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
  }, [mpesa, commit]);

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // The PIN may still be fixed after M-Pesa money is in; only block it mid-request.
  const pinDisabled = submitting || mpesaBusy;

  // Base UI reports why the dialog wants to close. Extra args are read loosely
  // because their shape differs between Base UI versions: a details object with
  // `reason` in current ones, or (event, reason) in older betas.
  function handleOpenChange(next: boolean, ...rest: unknown[]) {
    if (submitting || locked) return;
    if (!next && entries.length > 0) {
      const details = rest[0] as { reason?: string } | undefined;
      const reason =
        details?.reason ?? (typeof rest[1] === "string" ? rest[1] : undefined);
      // A stray click outside must not throw away payments already added
      if (reason === "outside-press") return;
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Sale total {formatKsh(totalCents)}
          </DialogDescription>
        </DialogHeader>

        <AmountDue
          totalCents={totalCents}
          paidCents={paidCents}
          remaining={remaining}
        />

        <PinSection
          open={showPin}
          pin={pin}
          name={pinName}
          problem={pinProblem}
          disabled={pinDisabled}
          onOpen={() => setShowPin(true)}
          onPinChange={setPin}
          onNameChange={setPinName}
          onRemove={removePin}
        />

        <EntryList
          entries={entries}
          disabled={submitting}
          onRemove={removeEntry}
        />

        {fullyPaid ? (
          <p className="rounded-lg border p-3 text-sm" role="status">
            {submitting
              ? "Completing the sale…"
              : "Payment received in full. Complete the sale to finish."}
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Payment method"
              className="grid grid-cols-3 gap-2"
            >
              {METHODS.map((m) => {
                const { label, icon: Icon, enabled } = METHOD_META[m];
                return (
                  <Button
                    key={m}
                    type="button"
                    variant={method === m ? "secondary" : "outline"}
                    aria-pressed={method === m}
                    className="h-16 flex-col gap-1 text-xl"
                    disabled={mpesaBusy || !enabled}
                    onClick={() => {
                      setMethod(m);
                      mpesa.reset();
                    }}
                  >
                    {/* <Icon className="size-5" aria-hidden /> */}
                    {label}
                    {!enabled && (
                      <span className="text-[10px] font-normal leading-none">
                        Coming soon
                      </span>
                    )}
                  </Button>
                );
              })}
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
                        enterKeyHint="done"
                        autoComplete="off"
                        className={`${INPUT_CLASS} h-12 text-lg`}
                        value={cash}
                        onChange={(e) => setCash(sanitizeMoney(e.target.value))}
                      />
                    </Field>

                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Quick amounts"
                    >
                      {quickAmounts(remaining).map((c) => (
                        <Button
                          key={c}
                          type="button"
                          size="sm"
                          variant={cashTendered === c ? "secondary" : "outline"}
                          aria-pressed={cashTendered === c}
                          className="h-11 tabular-nums"
                          onClick={() => {
                            setCash(centsToInput(c));
                            cashRef.current?.focus();
                          }}
                        >
                          {c === remaining ? "Exact" : formatKsh(c)}
                        </Button>
                      ))}
                    </div>

                    {draft.change !== undefined && draft.change > 0 && (
                      <div
                        className="rounded-xl p-3 text-center text-success"
                        role="status"
                      >
                        <p className="text-sm">Change to give</p>
                        <p className="text-3xl font-bold tabular-nums">
                          {formatKsh(draft.change)}
                        </p>
                      </div>
                    )}

                    {draft.leftAfter !== undefined && draft.leftAfter > 0 && (
                      <p
                        className="text-center text-sm text-muted-foreground"
                        role="status"
                      >
                        {formatKsh(draft.leftAfter)} will still be due after
                        this payment.
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
                        onChange={(e) =>
                          setCardAmount(sanitizeMoney(e.target.value))
                        }
                        className={`${INPUT_CLASS} h-12 text-lg`}
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
                        className={`${INPUT_CLASS} h-12`}
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
              variant={confirmLeave ? "destructive" : "outline"}
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
              disabled={submitting || !!pinProblem}
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
              disabled={!draft.entry || submitting || !!pinProblem}
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
            <p
              className="text-center text-xs text-muted-foreground"
              role="status"
            >
              {draft.problem}
            </p>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
