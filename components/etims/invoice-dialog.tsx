"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EtimsBadge } from "@/components/etims/etims-badge";
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
import { formatDateTime } from "@/lib/dashboard/format";
import type { InvoiceDetail } from "@/lib/etims/types";
import { formatKsh, toCents } from "@/lib/pos/money";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<string, string> = {
  PENDING: "Waiting to be sent to KRA",
  ACCEPTED: "Accepted by KRA",
  REJECTED: "KRA refused it, or it failed our own checks",
  FAILED: "Could not be sent (KRA could not be reached)",
  UNCERTAIN: "Sent, but we don't know if KRA received it",
  CANCELLED: "Cancelled before it was ever sent",
};

type Props = {
  invoiceId: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function InvoiceDialog({
  invoiceId,
  isAdmin,
  onClose,
  onChanged,
}: Props) {
  return (
    <Dialog open={invoiceId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {invoiceId && (
          <Body
            key={invoiceId}
            id={invoiceId}
            isAdmin={isAdmin}
            onChanged={onChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  id,
  isAdmin,
  onChanged,
}: {
  id: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const call = useApi();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setInv(await call<InvoiceDetail>(`/etims/invoices/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the invoice");
    }
  }, [call, id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await call<InvoiceDetail>(`/etims/invoices/${id}`);
        if (!cancelled) setInv(data);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load the invoice",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, id]);

  async function act(path: string, body: object | undefined, success: string) {
    setBusy(true);
    setError(null);
    try {
      await call(`/etims/invoices/${id}/${path}`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      });
      toast.success(success);
      onChanged();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  if (!inv) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Invoice</DialogTitle>
          <DialogDescription>{error ?? "Loading…"}</DialogDescription>
        </DialogHeader>
      </>
    );
  }

  const canRetry = ["REJECTED", "FAILED", "UNCERTAIN"].includes(inv.status);
  const canRebuild = ["REJECTED", "FAILED"].includes(inv.status);
  const fact = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm font-medium">{value ?? "-"}</dd>
    </div>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {inv.internalNo} <EtimsBadge status={inv.display} />
        </DialogTitle>
        <DialogDescription>
          {inv.type === "CREDIT_NOTE" ? "Credit note" : "Sales invoice"} ·{" "}
          {STATUS_TEXT[inv.status]}
          {inv.environment === "MOCK" && " · MOCK (not a real filing)"}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {inv.lastErrorMessage && inv.status !== "ACCEPTED" && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>
            {inv.lastErrorCode && <strong>{inv.lastErrorCode}: </strong>}
            {inv.lastErrorMessage}
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid gap-3 sm:grid-cols-3">
        {fact("Sale total", formatKsh(toCents(inv.sale.total)))}
        {fact("Cashier", inv.sale.cashier.name)}
        {fact("Sale time", formatDateTime(inv.sale.createdAt))}
        {fact("KRA invoice no.", inv.invcNo)}
        {fact(
          "KRA receipt no.",
          inv.receiptNo ? `${inv.receiptNo}/${inv.totalReceiptNo}` : null,
        )}
        {fact("SCU ID", inv.sdcId)}
        {fact("Attempts", inv.attemptCount)}
        {fact(
          "Last attempt",
          inv.lastAttemptAt ? formatDateTime(inv.lastAttemptAt) : null,
        )}
        {fact(
          "Next attempt",
          inv.job && ["QUEUED", "RETRY"].includes(inv.job.status)
            ? formatDateTime(inv.job.nextAttemptAt)
            : null,
        )}
      </dl>
      {inv.manuallyResolvedAt && (
        <p className="text-sm text-muted-foreground">
          This invoice&apos;s KRA data was entered by hand by an administrator
          on {formatDateTime(inv.manuallyResolvedAt)}.
        </p>
      )}

      {canRetry && (
        <div className="grid gap-2 rounded-lg border border-secondary/20 p-3">
          <p className="text-sm font-semibold">Actions</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-10"
              disabled={busy}
              onClick={() =>
                void act("retry", {}, "Queued for another attempt")
              }
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {inv.status === "UNCERTAIN" ? "Check with KRA again" : "Retry"}
            </Button>
            {canRebuild && (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                disabled={busy}
                onClick={() =>
                  void act("retry", { rebuild: true }, "Rebuilt and queued")
                }
              >
                Rebuild data and retry
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {inv.status === "UNCERTAIN"
              ? "This asks KRA what happened to the original request. It never sends a second copy."
              : "Rebuilding refreshes the item classification, barcode and units from the product. It never changes amounts or the tax class that was charged."}
          </p>
        </div>
      )}

      {inv.status === "UNCERTAIN" && (
        <ResolvePanel
          isAdmin={isAdmin}
          busy={busy}
          onSubmit={(body) => act("resolve", body, "Recorded")}
        />
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold">History</h3>
        <ol className="grid gap-2 text-sm">
          {inv.events.map((e) => (
            <li key={e.id} className="grid grid-cols-[8.5rem_1fr] gap-2">
              <span className="text-muted-foreground">
                {formatDateTime(e.createdAt)}
              </span>
              <span>
                <span className="font-medium">
                  {e.type.replaceAll("_", " ").toLowerCase()}
                </span>
                {e.message ? `: ${e.message}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <details className="rounded-lg border border-secondary/20 p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Data sent to KRA
        </summary>
        <pre
          className={cn(
            "mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs",
          )}
        >
          {JSON.stringify(inv.payload, null, 2)}
        </pre>
      </details>
    </>
  );
}

function ResolvePanel({
  isAdmin,
  busy,
  onSubmit,
}: {
  isAdmin: boolean;
  busy: boolean;
  onSubmit: (body: object) => void;
}) {
  const [choice, setChoice] = useState<
    "CONFIRM_NOT_FILED" | "CONFIRM_FILED" | null
  >(null);
  const [note, setNote] = useState("");
  const [f, setF] = useState({
    scuReceiptNo: "",
    scuTotalReceiptNo: "",
    signature: "",
    internalData: "",
    sdcId: "",
    sdcDateTime: "",
    mrcNo: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((c) => ({ ...c, [k]: e.target.value.trim() }));

  const filedOk =
    f.scuReceiptNo &&
    f.scuTotalReceiptNo &&
    f.signature &&
    f.internalData &&
    f.sdcId &&
    /^\d{14}$/.test(f.sdcDateTime);
  const valid =
    note.trim().length >= 5 &&
    (choice === "CONFIRM_NOT_FILED" ||
      (choice === "CONFIRM_FILED" && !!filedOk));

  return (
    <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50/50 p-3">
      <p className="text-sm font-semibold">Resolve by hand</p>
      <p className="text-xs text-muted-foreground">
        First look the invoice up on KRA&apos;s eTIMS portal. Choose what you
        found. Both choices are recorded in the history with your name.
      </p>
      <div
        role="radiogroup"
        aria-label="What did you find?"
        className="grid gap-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={choice === "CONFIRM_NOT_FILED"}
          onClick={() => setChoice("CONFIRM_NOT_FILED")}
          className={cn(
            "rounded-lg border p-3 text-left text-sm",
            choice === "CONFIRM_NOT_FILED"
              ? "border-primary bg-primary/5"
              : "hover:bg-accent",
          )}
        >
          <span className="block font-medium">
            KRA does not have this invoice
          </span>
          <span className="text-muted-foreground">
            It is sent again with the same invoice number.
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={choice === "CONFIRM_FILED"}
          disabled={!isAdmin}
          onClick={() => setChoice("CONFIRM_FILED")}
          className={cn(
            "rounded-lg border p-3 text-left text-sm disabled:opacity-60",
            choice === "CONFIRM_FILED"
              ? "border-primary bg-primary/5"
              : "hover:bg-accent",
          )}
        >
          <span className="block font-medium">
            KRA has it, and I will enter its official data
          </span>
          <span className="text-muted-foreground">
            {isAdmin
              ? "Copy the values exactly from the eTIMS portal."
              : "Only an administrator can do this."}
          </span>
        </button>
      </div>

      {choice === "CONFIRM_FILED" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["scuReceiptNo", "Receipt number"],
              ["scuTotalReceiptNo", "Total receipt number"],
              ["signature", "Receipt signature"],
              ["internalData", "Internal data"],
              ["sdcId", "SCU ID"],
              ["mrcNo", "MRC number (optional)"],
              ["sdcDateTime", "SCU date and time (yyyyMMddHHmmss)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key}>
              <FieldLabel htmlFor={`r-${key}`}>{label}</FieldLabel>
              <Input
                id={`r-${key}`}
                className="h-10 font-mono"
                value={f[key]}
                onChange={set(key)}
                autoComplete="off"
              />
            </Field>
          ))}
        </div>
      )}

      <Field>
        <FieldLabel htmlFor="r-note">What did you check?</FieldLabel>
        <Input
          id="r-note"
          className="h-10"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Looked up invoice 1042 on the eTIMS portal on 20 Oct"
          autoComplete="off"
        />
      </Field>

      <Button
        type="button"
        className="h-10 justify-self-start"
        disabled={!valid || busy}
        onClick={() =>
          onSubmit({
            action: choice,
            note: note.trim(),
            ...(choice === "CONFIRM_FILED" && {
              ...f,
              scuReceiptNo: Number(f.scuReceiptNo),
              scuTotalReceiptNo: Number(f.scuTotalReceiptNo),
              mrcNo: f.mrcNo || undefined,
            }),
          })
        }
      >
        Record this
      </Button>
    </div>
  );
}
