"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircleCheck,
  Info,
  Loader2,
  Printer,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Paper, usePaperWidth } from "@/hooks/use-paper-width";
import type { EtimsDisplay, Receipt } from "@/lib/pos/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ReceiptBody } from "./receipt-body";

export { ReceiptBody };

function StatusNote({ r }: { r: Receipt }) {
  const e = r.etims;
  if (!e) return null;
  const box = "flex items-start gap-2 rounded-lg border p-3 text-xs";
  switch (e.status) {
    case "PENDING":
      return (
        <p className={box} role="status">
          <Loader2
            className="mt-0.5 size-4 shrink-0 animate-spin"
            aria-hidden
          />
          Waiting for KRA to confirm the tax invoice. The official copy will be
          ready to print in a moment. This provisional receipt can be printed
          now.
        </p>
      );
    case "ACCEPTED":
      return (
        <p
          className={cn(
            box,
            "border-teal-200 text-xs bg-teal-50 text-teal-900",
          )}
          role="status"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Tax invoice accepted by KRA
          {e.invoiceNo ? ` (invoice ${e.invoiceNo})` : ""}.
          {e.copy > 0 ? " Printing again will be marked COPY." : ""}
        </p>
      );
    case "MOCK_ACCEPTED":
      return (
        <p
          className={cn(
            box,
            "border-amber-300 text-xs bg-amber-50 text-amber-900",
          )}
          role="status"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Development mode: this invoice was NOT filed with KRA and is not a tax
          invoice.
        </p>
      );
    case "FAILED":
      return (
        <p
          className={cn(box, "border-red-200 bg-red-50 text-red-900")}
          role="alert"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          The tax invoice could not be filed with KRA yet. A manager can retry
          it. This is only a provisional receipt.
        </p>
      );
    default:
      return null;
  }
}

type Props = {
  receipt: Receipt | null;
  onClose: () => void;
  title?: string;
  closeLabel?: string;
  extraActions?: ReactNode;
};

export function ReceiptDialog({
  receipt,
  onClose,
  title = "Sale complete",
  closeLabel = "New sale",
  extraActions,
}: Props) {
  const call = useApi();
  const [paper, setPaper] = usePaperWidth();
  const doneRef = useRef<HTMLButtonElement>(null);

  const [live, setLive] = useState<Receipt | null>(receipt);
  const [prevReceipt, setPrevReceipt] = useState(receipt);
  if (receipt !== prevReceipt) {
    setPrevReceipt(receipt);
    setLive(receipt);
  }

  useEffect(() => {
    if (!receipt) return;
    const t = setTimeout(() => doneRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [receipt]);

  // While KRA hasn't answered, check every few seconds and swap in the official receipt when it arrives
  const saleId = live?.saleId;
  const pending = live?.etims?.status === "PENDING";
  useEffect(() => {
    if (!saleId || !pending) return;
    let stopped = false;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const s = await call<{ status: EtimsDisplay }>(
          `/etims/sales/${saleId}`,
        );
        if (s.status !== "PENDING") {
          const fresh = await call<Receipt>(`/sales/${saleId}/receipt`);
          if (!stopped) setLive(fresh);
        }
      } catch {
        /* try again on the next tick */
      }
      if (tries >= 40) clearInterval(timer); // about two minutes; the note stays and Check again is offered
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [saleId, pending, call]);

  async function refresh() {
    if (!saleId) return;
    try {
      setLive(await call<Receipt>(`/sales/${saleId}/receipt`));
    } catch {
      /* the note simply stays as it was */
    }
  }

  async function print() {
    window.print(); // blocks until the print dialog closes in most browsers
    const official =
      live?.etims?.status === "ACCEPTED" ||
      live?.etims?.status === "MOCK_ACCEPTED";
    if (live && official) {
      try {
        await call(`/etims/sales/${live.saleId}/printed`, { method: "POST" });
        await refresh(); // the next print is now a COPY
      } catch {
        /* counting the print must never get in the way of the sale */
      }
    }
  }

  if (!live) return null;
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{live.receiptNo}</DialogDescription>
          </DialogHeader>

          <StatusNote r={live} />

          <div className="max-h-[45vh] overflow-y-auto rounded-lg border bg-white p-4">
            <ReceiptBody r={live} paper={paper} />
          </div>

          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Paper</span>
            <div
              role="group"
              aria-label="Paper width"
              className="flex gap-1 rounded-lg border p-1"
            >
              {(["58mm", "80mm"] as Paper[]).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={paper === p ? "default" : "ghost"}
                  aria-pressed={paper === p}
                  className="h-8"
                  onClick={() => setPaper(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            {pending && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => void refresh()}
              >
                Check again
              </Button>
            )}
          </div>

          <DialogFooter>
            {extraActions}
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => void print()}
            >
              <Printer aria-hidden /> Print
            </Button>
            <Button
              ref={doneRef}
              type="button"
              className="h-11"
              onClick={onClose}
            >
              {closeLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* hidden on screen, the only thing visible when printing (see the @media print rule) */}
      {createPortal(
        <div id="print-root" className="hidden print:block">
          <style>{`@page { size: ${paper} auto; margin: 0; }`}</style>
          <ReceiptBody r={live} paper={paper} />
        </div>,
        document.body,
      )}
    </>
  );
}
