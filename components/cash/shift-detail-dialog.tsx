// components/cash/shift-detail-dialog.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { CloseShiftDialog } from "@/components/cash/close-shift-dialog";
import { MovementDialog } from "@/components/cash/movement-dialog";
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
import { MOVEMENT_LABEL, ksh } from "@/lib/cash/format";
import type { ShiftView } from "@/lib/cash/types";
import { formatDateTime } from "@/lib/dashboard/format";
import { useApi } from "@/lib/use-api";

export function ShiftDetailDialog({
  shiftId,
  onClose,
  onChanged,
}: {
  shiftId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Dialog open={shiftId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {shiftId && <Body key={shiftId} id={shiftId} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ id, onChanged }: { id: string; onChanged: () => void }) {
  const call = useApi();
  const [s, setS] = useState<ShiftView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    try {
      setS(await call<ShiftView>(`/cash/shifts/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the shift");
    }
  }, [call, id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function acknowledge() {
    setBusy(true);
    setError(null);
    try {
      setS(
        await call<ShiftView>(`/cash/shifts/${id}/acknowledge`, {
          method: "POST",
          body: JSON.stringify({ note: note.trim() }),
        }),
      );
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!s)
    return (
      <DialogHeader>
        <DialogTitle>Shift</DialogTitle>
        <DialogDescription>{error ?? "Loading…"}</DialogDescription>
      </DialogHeader>
    );
  const f = s.figures;
  const line = (label: string, value: string, strong = false) => (
    <div
      className={
        strong
          ? "flex justify-between border-t pt-2 font-semibold"
          : "flex justify-between"
      }
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Shift #{s.number}: {s.cashierName}
        </DialogTitle>
        <DialogDescription>
          {s.status === "OPEN" ? "Open" : "Closed"} · opened{" "}
          {formatDateTime(s.openedAt)}
          {s.closedAt && ` · closed ${formatDateTime(s.closedAt)}`}
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <dl className="grid gap-2 rounded-lg border p-4 text-sm">
        {line("Opening float", ksh(f.openingFloat))}
        {line(`Cash sales (${f.byMethod.CASH?.count ?? 0})`, ksh(f.cashSales))}
        {Number(f.cashIn) > 0 && line("Cash added", ksh(f.cashIn))}
        {line("Paid out", `−${ksh(f.paidOut)}`)}
        {line("Dropped to safe", `−${ksh(f.cashDrops)}`)}
        {line("Expected in drawer", ksh(s.expectedCash), true)}
        {s.countedCash !== null && line("Counted", ksh(s.countedCash))}
        {s.variance !== null &&
          line(
            "Difference",
            Number(s.variance) === 0 ? "Exact" : ksh(s.variance),
            true,
          )}
      </dl>
      <p className="text-xs text-muted-foreground">
        Not cash:{" "}
        {Object.entries(f.byMethod)
          .filter(([m]) => m !== "CASH")
          .map(([m, v]) => `${m === "MPESA" ? "M-Pesa" : m} ${ksh(v.amount)}`)
          .join(" · ") || "none"}
        {f.voided.count > 0 &&
          ` · ${f.voided.count} voided sale${f.voided.count === 1 ? "" : "s"} (${ksh(f.voided.total)}) not counted`}
      </p>

      {s.closeNote && (
        <p className="text-sm">
          <strong>Cashier&apos;s note:</strong> {s.closeNote}
        </p>
      )}

      {s.movements.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {s.movements.map((m) => (
            <li key={m.id} className="flex justify-between gap-3 border-b py-1">
              <span>
                <span className="font-medium">{MOVEMENT_LABEL[m.type]}</span> ·{" "}
                {m.reason}{" "}
                <span className="text-muted-foreground">
                  ({m.by}, {formatDateTime(m.createdAt)})
                </span>
              </span>
              <span className="tabular-nums">
                {m.type === "CASH_IN" ? "+" : "−"}
                {ksh(m.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {s.status === "OPEN" && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setMoving(true)}
          >
            Record paid-out or cash added
          </Button>
          <Button
            type="button"
            className="h-11"
            onClick={() => setClosing(true)}
          >
            Close this shift for the cashier
          </Button>
        </div>
      )}

      {s.status === "CLOSED" && s.needsReview && (
        <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50/50 p-3">
          <p className="text-sm font-semibold">
            This difference needs your review
          </p>
          <Field>
            <FieldLabel htmlFor="review-note">
              What did you find out?
            </FieldLabel>
            <Input
              id="review-note"
              className="h-11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={250}
              autoComplete="off"
            />
          </Field>
          <Button
            type="button"
            className="h-11 justify-self-start"
            disabled={busy || note.trim().length < 3}
            onClick={() => void acknowledge()}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />} Mark as
            reviewed
          </Button>
        </div>
      )}
      {s.reviewedAt && (
        <p className="text-sm text-muted-foreground">
          Reviewed {formatDateTime(s.reviewedAt)}: {s.reviewNote}
        </p>
      )}

      <MovementDialog
        shiftId={s.id}
        open={moving}
        initialType="PAID_OUT"
        types={["PAID_OUT", "CASH_IN", "CASH_DROP"]}
        inDrawer={f.expectedCash}
        paidOutLimit={s.paidOutLimit}
        limited={false}
        onClose={() => setMoving(false)}
        onDone={() => {
          void load();
          onChanged();
        }}
      />
      <CloseShiftDialog
        shift={s}
        open={closing}
        onBehalf
        onClose={() => setClosing(false)}
        onClosed={(v) => {
          setClosing(false);
          setS(v);
          onChanged();
        }}
      />
    </>
  );
}
