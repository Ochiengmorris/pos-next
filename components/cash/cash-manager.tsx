"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, FileWarning, HandCoins, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ShiftDetailDialog } from "@/components/cash/shift-detail-dialog";
// import { KpiCard } from "@/components/dashboard/kpi-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ksh } from "@/lib/cash/format";
import type { DaySummary } from "@/lib/cash/types";
import { formatDateTime } from "@/lib/dashboard/format";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { KpiCard } from "../dashboard/kpi-cards";

export function CashManager({ initial }: { initial: DaySummary }) {
  const call = useApi();
  const [date, setDate] = useState(initial.date);
  const [data, setData] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let off = false;
    setLoading(true);
    call<DaySummary>(`/cash/summary?date=${date}`)
      .then((r) => {
        if (!off) {
          setData(r);
          setError(null);
        }
      })
      .catch(
        (e) =>
          !off && setError(e instanceof Error ? e.message : "Could not load"),
      )
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [call, date, tick]);

  const t = data.totals;
  const v = Number(t.variance);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Cash"
        description="Every cashier's drawer for the day: what came in, what went out, and what was found."
        actions={
          <Input
            type="date"
            aria-label="Day"
            value={date}
            max={initial.date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-11 w-44 bg-card"
          />
        }
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {t.open > 0 && (
        <Alert>
          <AlertDescription className="text-foreground">
            {t.open} {t.open === 1 ? "shift is" : "shifts are"} still open.
          </AlertDescription>
        </Alert>
      )}

      <section
        aria-label="Day totals"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Cash sales"
          value={ksh(t.cashSales)}
          icon={Banknote}
          tone="teal"
        >
          <span>
            {t.shifts} {t.shifts === 1 ? "shift" : "shifts"}
          </span>
        </KpiCard>
        <KpiCard
          label="M-Pesa and card"
          value={ksh(Number(t.mpesa) + Number(t.card))}
          icon={Smartphone}
          tone="blue"
        >
          <span>
            M-Pesa {ksh(t.mpesa)} · Card {ksh(t.card)}
          </span>
        </KpiCard>
        <KpiCard
          label="Paid out / dropped"
          value={ksh(t.paidOut)}
          icon={HandCoins}
          tone="amber"
        >
          <span>{ksh(t.drops)} dropped to the safe</span>
        </KpiCard>
        <KpiCard
          label="Net difference"
          value={ksh(t.variance)}
          icon={FileWarning}
          tone={v < 0 ? "red" : "teal"}
        >
          <span>
            {t.needsReview > 0
              ? `${t.needsReview} to review`
              : "Nothing to review"}
          </span>
        </KpiCard>
      </section>

      <div
        className={cn(
          "rounded-xl border bg-card shadow-sm transition-opacity",
          loading && "opacity-60",
        )}
        aria-busy={loading}
      >
        <Table>
          <caption className="sr-only">Shifts</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead className="text-right">Cash sales</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Expected
              </TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Counted
              </TableHead>
              <TableHead className="text-right">Difference</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.shifts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-16 text-center text-muted-foreground"
                >
                  No shifts on this day.
                </TableCell>
              </TableRow>
            ) : (
              data.shifts.map((s) => {
                const d = Number(s.variance ?? 0);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.cashierName}</div>
                      <div className="text-xs text-muted-foreground">
                        #{s.number} · {s.status === "OPEN" ? "Open" : "Closed"}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(s.openedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ksh(s.cashSales)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {ksh(s.expectedCash)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {s.countedCash ? ksh(s.countedCash) : "-"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        d < 0 && "text-red-700",
                        d > 0 && "text-amber-700",
                      )}
                    >
                      {s.variance === null ? "-" : d === 0 ? "Exact" : ksh(d)}
                      {s.needsReview && (
                        <div className="text-xs font-normal text-red-700">
                          Needs review
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() => setOpen(s.id)}
                        aria-label={`Details for shift ${s.number}`}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ShiftDetailDialog
        shiftId={open}
        onClose={() => setOpen(null)}
        onChanged={() => setTick((n) => n + 1)}
      />
    </div>
  );
}
