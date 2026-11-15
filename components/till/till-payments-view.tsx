"use client";

import { useEffect, useState } from "react";
import {
  CircleCheck,
  Download,
  Smartphone,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DatePicker } from "@/components/app/date-picker-mine";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatDateTime } from "@/lib/dashboard/format";
import type { TillDay, TillStatus } from "@/lib/till/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { KpiCard } from "../dashboard/kpi-cards";

const LABEL: Record<TillStatus, string> = {
  UNCLAIMED: "Not on a sale",
  CLAIMED: "On a sale",
  MATCHED_STK: "STK push (on its sale)",
  IGNORED: "Set aside",
};

const TONE: Record<TillStatus, string> = {
  UNCLAIMED: "bg-amber-100 text-amber-900",
  CLAIMED: "bg-teal-100 text-teal-900",
  MATCHED_STK: "bg-slate-100 text-slate-700",
  IGNORED: "bg-slate-100 text-slate-500",
};

function today() {
  // yyyy-mm-dd in Nairobi time
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date());
}

/**
 * Manager screen: every payment that reached the till on a day, how each one was used,
 * and totals to compare with the statement from the M-PESA Business portal.
 */
export function TillPaymentsView() {
  const call = useApi();
  const [date, setDate] = useState(today());
  const [day, setDay] = useState<TillDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [setAside, setSetAside] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await call<TillDay>(`/till-payments?date=${date}`);
        if (cancelled) return;
        setDay(res);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, date, refreshKey]);

  async function ignore(id: string) {
    setError(null);
    try {
      await call(`/till-payments/${id}/ignore`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setSetAside(null);
      setReason("");
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not set that payment aside",
      );
    }
  }

  async function download() {
    try {
      const f = await call<{ filename: string; csv: string }>(
        `/till-payments/export?date=${date}`,
      );
      const url = URL.createObjectURL(new Blob([f.csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = f.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download the file");
    }
  }

  const t = day?.totals;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Till payments"
        description="Payments customers made straight to the till, and what happened to each one."
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => void download()}
            disabled={!day}
          >
            <Download className="size-4" aria-hidden /> Download for this day
          </Button>
        }
      />

      <div className="max-w-xs">
        <DatePicker
          value={date}
          onChange={(v) => {
            setLoading(true);
            setDate(v);
          }}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {t && (
        <section
          aria-label="Totals"
          aria-busy={loading}
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
            loading && "opacity-60",
          )}
        >
          <KpiCard
            label="Received from Safaricom"
            value={ksh(t.received.amount)}
            icon={Smartphone}
            tone="teal"
          >
            <span>{t.received.count} payments</span>
          </KpiCard>
          <KpiCard
            label="On a sale"
            value={ksh(t.claimed.amount)}
            icon={CircleCheck}
            tone="blue"
          >
            <span>{t.claimed.count} payments, by cashiers</span>
          </KpiCard>
          <KpiCard
            label="STK push"
            value={ksh(t.matchedStk.amount)}
            icon={Zap}
            tone="violet"
          >
            <span>{t.matchedStk.count} payments, already on sales</span>
          </KpiCard>
          <KpiCard
            label="Not on any sale"
            value={ksh(t.unclaimed.amount)}
            icon={TriangleAlert}
            tone={t.unclaimed.count > 0 ? "amber" : "teal"}
          >
            <span>
              {t.unclaimed.count > 0
                ? `${t.unclaimed.count} payments to deal with`
                : "Nothing to deal with"}
            </span>
          </KpiCard>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            At the end of the day, the first total above should equal the
            till&apos;s total on the M-PESA Business portal statement for the
            same day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>M-Pesa code</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>What happened</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {day && day.rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No till payments arrived on this day.
                  </TableCell>
                </TableRow>
              )}
              {day?.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.time)}
                  </TableCell>
                  <TableCell className="font-mono">{r.transId}</TableCell>
                  <TableCell>{r.payerName ?? "–"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {ksh(r.amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        TONE[r.status],
                      )}
                    >
                      {LABEL[r.status]}
                    </span>
                    {(r.ignoredReason ?? r.note) && (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {r.ignoredReason ?? r.note}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "UNCLAIMED" &&
                      (setAside === r.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why? (5+ letters)"
                            className="h-9 w-48"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={reason.trim().length < 5}
                            onClick={() => void ignore(r.id)}
                          >
                            Set aside
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSetAside(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSetAside(r.id);
                            setReason("");
                          }}
                        >
                          Set aside
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  warn,
}: {
  label: string;
  value: string;
  note: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        warn && "border-amber-300 bg-amber-50",
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
