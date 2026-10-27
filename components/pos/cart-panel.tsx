"use client";

import { useState } from "react";
import { ArrowRight, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKsh } from "@/lib/pos/money";
import type { CartLine } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

// type a quantity and press Enter; invalid input snaps back
function QtyInput({
  line,
  onCommit,
}: {
  line: CartLine;
  onCommit: (qty: number) => void;
}) {
  const [draft, setDraft] = useState(String(line.quantity));

  function commit() {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 1 && n !== line.quantity) onCommit(n);
    else setDraft(String(line.quantity));
  }

  return (
    <Input
      inputMode="numeric"
      aria-label={`Quantity of ${line.name}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="mx-auto h-9 w-16 text-center tabular-nums"
    />
  );
}

type LinesProps = {
  lines: CartLine[];
  highlightId?: string | null;
  compact?: boolean; // narrow panel: unit price goes under the name instead of its own column
  onSetQty: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
};

export function CartLines({
  lines,
  highlightId,
  compact = false,
  onSetQty,
  onRemove,
}: LinesProps) {
  if (lines.length === 0) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
        <p>Scan a barcode or pick a product to start a sale.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full table-fixed text-sm ">
        <caption className="sr-only">Items in the current sale</caption>
        <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Item
            </th>
            <th scope="col" className="w-20 px-1 py-2 text-center font-medium">
              Qty
            </th>
            {!compact && (
              <th scope="col" className="w-24 px-2 py-2 text-right font-medium">
                Price
              </th>
            )}
            <th scope="col" className="w-24 px-2 py-2 text-right font-medium">
              Total
            </th>
            <th scope="col" className="w-12">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((l) => (
            <tr
              key={l.productId}
              className={cn(
                compact ? "h-14" : "h-12",
                l.productId === highlightId && "bg-accent/10",
              )}
            >
              <td className="overflow-hidden px-4">
                <div className="truncate font-medium">{l.name}</div>
                {compact && (
                  <div className="text-xs text-muted-foreground">
                    {formatKsh(l.priceCents)} each
                  </div>
                )}
              </td>
              <td className="px-1">
                <QtyInput
                  key={l.quantity}
                  line={l}
                  onCommit={(q) => onSetQty(l.productId, q)}
                />
              </td>
              {!compact && (
                <td className="px-2 text-right tabular-nums text-muted-foreground">
                  {formatKsh(l.priceCents)}
                </td>
              )}
              <td className="px-2 text-right font-semibold tabular-nums">
                {formatKsh(l.priceCents * l.quantity)}
              </td>
              <td className="px-1 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground"
                  aria-label={`Remove ${l.name}`}
                  onClick={() => onRemove(l.productId)}
                >
                  <X aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SummaryProps = {
  totalCents: number;
  vatCents: number;
  itemCount: number;
  hasLines: boolean;
  large?: boolean;
  onPay: () => void;
  onClear: () => void;
};

export function CartSummary({
  totalCents,
  vatCents,
  itemCount,
  hasLines,
  large = false,
  onPay,
  onClear,
}: SummaryProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="grid gap-3 p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
        <span>Incl. VAT: {formatKsh(vatCents)}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-base font-semibold">Total</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            large ? "text-5xl" : "text-3xl",
          )}
        >
          {formatKsh(totalCents)}
        </span>
      </div>

      <Button
        type="button"
        size="lg"
        className="h-12 text-base"
        disabled={!hasLines}
        onClick={onPay}
      >
        Proceed to pay
        <ArrowRight aria-hidden />
        <kbd className="ml-1 hidden rounded border border-secondary/50 px-1.5 text-xs font-semibold md:inline">
          Ctrl+Enter
        </kbd>
      </Button>

      {hasLines && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 text-muted-foreground"
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true);
              setTimeout(() => setConfirmClear(false), 3000);
              return;
            }
            setConfirmClear(false);
            onClear();
          }}
        >
          {confirmClear ? "Tap again to clear the sale" : "Clear sale"}
        </Button>
      )}
    </div>
  );
}

// Grid mode: header + lines + summary in one card
export function CartPanel(
  props: LinesProps & Omit<SummaryProps, "hasLines" | "large">,
) {
  return (
    <Card className="min-h-96 gap-0 overflow-hidden py-0 md:min-h-0">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ShoppingCart className="size-5" aria-hidden />
        <h2 className="text-base font-semibold">Current sale</h2>
      </div>
      <CartLines {...props} compact />
      <div className="border-t">
        <CartSummary {...props} hasLines={props.lines.length > 0} />
      </div>
    </Card>
  );
}
