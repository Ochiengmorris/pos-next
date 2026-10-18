"use client";

import { useState } from "react";
import {
  CircleCheck,
  CircleDollarSign,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
// import { KpiCard } from "@/components/dashboard/kpi-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLongDate } from "@/lib/dashboard/format";
import { formatKsh, parseCents, toCents } from "@/lib/pos/money";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { KpiCard } from "../dashboard/kpi-cards";
import { DatePicker } from "../app/date-picker-mine";

export type Shift = {
  date: string;
  transactions: number;
  revenue: string;
  byMethod: { method: string; payments: number; amount: string }[];
  cashExpected: string;
};

const METHOD: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MPESA: "M-Pesa",
};

export function ShiftView({ initial }: { initial: Shift }) {
  const call = useApi();
  const [shift, setShift] = useState(initial);
  const [date, setDate] = useState(initial.date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counted, setCounted] = useState("");

  async function load(next: string) {
    setDate(next);
    if (!next) return;
    setLoading(true);
    setError(null);
    try {
      setShift(await call<Shift>(`/reports/shift?date=${next}`));
      setCounted("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the shift");
    } finally {
      setLoading(false);
    }
  }

  const expected = toCents(shift.cashExpected);
  const countedCents = parseCents(counted);
  const diff = countedCents === null ? null : countedCents - expected;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="My shift"
        description={`Sales you rang up on ${formatLongDate(shift.date)}.`}
      />

      <Field className="max-w-xs">
        <FieldLabel htmlFor="shift-date">Shift date</FieldLabel>

        <DatePicker value={date} onChange={(v) => void load(v)} />
      </Field>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-4 flex-col lg:flex-row">
        <div className="flex-1 ">
          <section
            aria-label="Shift totals"
            aria-busy={loading}
            className={cn(
              "grid gap-4 transition-opacity sm:grid-cols-3 mb-4",
              loading && "opacity-60",
            )}
          >
            <KpiCard
              label="Sales"
              value={String(shift.transactions)}
              icon={Receipt}
              tone="blue"
            >
              <span>Completed transactions</span>
            </KpiCard>
            <KpiCard
              label="Total taken"
              value={formatKsh(toCents(shift.revenue))}
              icon={CircleDollarSign}
              tone="teal"
            >
              <span>All payment methods</span>
            </KpiCard>
            <KpiCard
              label="Cash expected"
              value={formatKsh(expected)}
              icon={Wallet}
              tone="amber"
            >
              <span>Cash kept after giving change</span>
            </KpiCard>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>By payment method</CardTitle>
              <CardDescription>Voided sales are not counted.</CardDescription>
            </CardHeader>
            <CardContent>
              {shift.byMethod.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No sales on this date.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Payments</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shift.byMethod.map((m) => (
                      <TableRow key={m.method}>
                        <TableCell className="font-medium">
                          {METHOD[m.method] ?? m.method}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.payments}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatKsh(toCents(m.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Count the drawer</CardTitle>
            <CardDescription>
              Enter the cash you counted to check it against what the system
              expects.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field className="max-w-xs">
              <FieldLabel htmlFor="counted">Cash counted (KSh)</FieldLabel>
              <Input
                id="counted"
                inputMode="decimal"
                autoComplete="off"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                className="h-12 text-lg"
              />
              <FieldDescription>
                Include only the takings, not your opening float or any cash
                paid out.
              </FieldDescription>
            </Field>

            {diff !== null && (
              <p
                role="status"
                className={cn(
                  "flex items-center gap-2 text-lg font-semibold",
                  diff === 0 ? "text-teal-700" : "text-red-700",
                )}
              >
                {diff === 0 ? (
                  <CircleCheck aria-hidden />
                ) : (
                  <TriangleAlert aria-hidden />
                )}
                {diff === 0
                  ? "The drawer matches."
                  : diff > 0
                    ? `Over by ${formatKsh(diff)}`
                    : `Short by ${formatKsh(-diff)}`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
