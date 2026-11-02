"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  HandCoins,
  Landmark,
  Receipt,
  Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { CloseShiftDialog } from "@/components/cash/close-shift-dialog";
import { MovementDialog } from "@/components/cash/movement-dialog";
import { OpenShiftForm } from "@/components/cash/open-shift-form";
import { StaleShiftBanner } from "@/components/cash/stale-shift-banner";
// import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOVEMENT_LABEL, ksh } from "@/lib/cash/format";
import type { CurrentShift, MovementType, ShiftView } from "@/lib/cash/types";
import { formatDateTime } from "@/lib/dashboard/format";
import { useApi } from "@/lib/use-api";
import { KpiCard } from "../dashboard/kpi-cards";

export function ShiftPanel({ initial }: { initial: CurrentShift }) {
  const call = useApi();
  const [cur, setCur] = useState(initial);
  const [result, setResult] = useState<ShiftView | null>(null);
  const [dialog, setDialog] = useState<
    null | "PAID_OUT" | "CASH_DROP" | "close"
  >(null);

  const reload = useCallback(async () => {
    setCur(await call<CurrentShift>("/cash/shifts/current"));
  }, [call]);

  // sales made at the till appear here without a refresh
  useEffect(() => {
    const t = setInterval(() => void reload().catch(() => {}), 60_000);
    return () => clearInterval(t);
  }, [reload]);

  if (result)
    return (
      <ClosedResult
        shift={result}
        onNew={() => {
          setResult(null);
          void reload();
        }}
      />
    );

  const s = cur.shift;
  if (!s) {
    return (
      <div className="mx-auto grid max-w-md gap-4 pt-6">
        <PageHeader
          title="Open your shift"
          description="Count the cash in your drawer and enter it to start."
        />
        <OpenShiftForm onOpened={() => void reload()} />
      </div>
    );
  }

  const f = s.figures;
  const other = Object.entries(f.byMethod).filter(([m]) => m !== "CASH");

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="My shift"
        description={`Shift #${s.number} · opened ${formatDateTime(s.openedAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setDialog("PAID_OUT")}
            >
              Record paid-out
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setDialog("CASH_DROP")}
            >
              Cash drop
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={() => setDialog("close")}
            >
              Close shift
            </Button>
          </div>
        }
      />
      {cur.stale && <StaleShiftBanner />}

      <section
        aria-label="Shift totals"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Cash that should be in the drawer"
          value={ksh(f.expectedCash)}
          icon={Banknote}
          tone="teal"
        >
          <span>
            Float {ksh(f.openingFloat)} + cash sales {ksh(f.cashSales)}
          </span>
        </KpiCard>
        <KpiCard
          label="Sales this shift"
          value={String(f.sales.count)}
          icon={Receipt}
          tone="blue"
        >
          <span>{ksh(f.sales.total)} in total</span>
        </KpiCard>
        <KpiCard
          label="Paid out"
          value={ksh(f.paidOut)}
          icon={HandCoins}
          tone="amber"
        >
          <span>{ksh(f.cashDrops)} dropped to the safe</span>
        </KpiCard>
        <KpiCard
          label="Not cash"
          value={ksh(other.reduce((a, [, v]) => a + Number(v.amount), 0))}
          icon={Smartphone}
          tone="blue"
        >
          <span>
            {other.length
              ? other
                  .map(
                    ([m, v]) =>
                      `${m === "MPESA" ? "M-Pesa" : m === "CARD" ? "Card" : m} ${ksh(v.amount)}`,
                  )
                  .join(" · ")
              : "None yet"}
          </span>
        </KpiCard>
      </section>

      <section
        aria-label="Cash movements"
        className="rounded-xl border bg-card shadow-sm"
      >
        <h2 className="flex items-center gap-2 border-b p-4 text-sm font-semibold">
          <Landmark className="size-4" aria-hidden /> Paid-outs and drops
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.movements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nothing recorded this shift.
                </TableCell>
              </TableRow>
            ) : (
              s.movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </TableCell>
                  <TableCell>{MOVEMENT_LABEL[m.type]}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.type === "CASH_IN" ? "+" : "−"}
                    {ksh(m.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <MovementDialog
        shiftId={s.id}
        open={dialog === "PAID_OUT" || dialog === "CASH_DROP"}
        initialType={dialog === "CASH_DROP" ? "CASH_DROP" : "PAID_OUT"}
        types={["PAID_OUT", "CASH_DROP"] as MovementType[]}
        inDrawer={f.expectedCash}
        paidOutLimit={cur.paidOutLimit}
        limited
        onClose={() => setDialog(null)}
        onDone={() => void reload()}
      />
      <CloseShiftDialog
        shift={s}
        open={dialog === "close"}
        onBehalf={false}
        onClose={() => setDialog(null)}
        onClosed={(v) => {
          setDialog(null);
          setResult(v);
        }}
      />
    </div>
  );
}

function ClosedResult({
  shift,
  onNew,
}: {
  shift: ShiftView;
  onNew: () => void;
}) {
  const v = Number(shift.variance ?? 0);
  return (
    <div className="mx-auto grid max-w-md gap-4 pt-6">
      <PageHeader title="Shift closed" description={`Shift #${shift.number}`} />
      <dl className="grid gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Expected</dt>
          <dd className="tabular-nums">{ksh(shift.expectedCash)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">You counted</dt>
          <dd className="tabular-nums">{ksh(shift.countedCash ?? 0)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <dt>Difference</dt>
          <dd
            className={
              v === 0
                ? "text-teal-700"
                : v < 0
                  ? "text-red-700"
                  : "text-amber-700"
            }
          >
            {v === 0 ? "Exact" : v < 0 ? `Short ${ksh(-v)}` : `Over ${ksh(v)}`}
          </dd>
        </div>
      </dl>
      {shift.needsReview && (
        <p className="text-sm text-muted-foreground">
          A manager will review this difference.
        </p>
      )}
      <Button type="button" className="h-12" onClick={onNew}>
        Open a new shift
      </Button>
    </div>
  );
}
