"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { Receipt } from "@/lib/pos/types";

const METHOD: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MPESA: "M-Pesa",
};
const money = (v: string) => formatKsh(toCents(v));

function Row({
  left,
  right,
  bold,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span>{left}</span>
      <span className="whitespace-nowrap tabular-nums">{right}</span>
    </div>
  );
}

// the same markup is the on-screen preview and the printed receipt
export function ReceiptBody({ r }: { r: Receipt }) {
  const when = new Date(r.date).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <div className="mx-auto w-full max-w-[72mm] font-mono text-xs leading-5 text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{r.store.name}</p>
        {r.store.address && <p>{r.store.address}</p>}
        {r.store.phone && <p>{r.store.phone}</p>}
        {r.store.taxPin && <p>PIN: {r.store.taxPin}</p>}
      </div>
      {r.status !== "COMPLETED" && (
        <p className="my-2 border-y border-dashed border-black py-1 text-center font-bold">
          *** {r.status === "VOIDED" ? "VOIDED" : "REFUNDED"} ***
        </p>
      )}
      <hr className="my-2 border-dashed border-black" />
      <Row left="Receipt" right={r.receiptNo} />
      <Row left="Date" right={when} />
      <Row left="Cashier" right={r.cashier} />
      <hr className="my-2 border-dashed border-black" />
      {r.items.map((i, n) => (
        <div key={n} className="mb-1">
          <p>{i.name}</p>
          <Row
            left={`  ${i.quantity} x ${money(i.unitPrice)}`}
            right={money(i.lineTotal)}
          />
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <Row left="Net (excl. VAT)" right={money(r.subtotal)} />
      <Row left="VAT included" right={money(r.taxTotal)} />
      <Row left="TOTAL" right={money(r.total)} bold />
      <hr className="my-2 border-dashed border-black" />
      {r.payments.map((p, n) => (
        <div key={n}>
          <Row
            left={`${METHOD[p.method] ?? p.method}${p.reference ? ` (Ref:${p.reference})` : ""}`}
            right={money(p.amount)}
          />
        </div>
      ))}
      {toCents(r.changeDue) > 0 && (
        <Row left="Change" right={money(r.changeDue)} bold />
      )}
      {r.store.footer && <p className="mt-3 text-center">{r.store.footer}</p>}
    </div>
  );
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
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!receipt) return;
    const t = setTimeout(() => doneRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [receipt]);

  if (!receipt) return null;
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{receipt.receiptNo}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border bg-white p-4">
            <ReceiptBody r={receipt} />
          </div>
          <DialogFooter>
            {extraActions}
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => window.print()}
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
          <ReceiptBody r={receipt} />
        </div>,
        document.body,
      )}
    </>
  );
}
