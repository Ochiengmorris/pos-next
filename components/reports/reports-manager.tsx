"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Percent,
  Receipt,
  ShoppingBasket,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
// import { Change, KpiCard } from "@/components/dashboard/kpi-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatKsh, toCents } from "@/lib/pos/money";
import { loadReports } from "@/lib/reports/load";
import {
  type FixedPreset,
  intervalFor,
  type Preset,
  type Range,
  rangeFor,
  spanDays,
} from "@/lib/reports/range";
import type { ReportsBundle, TopBy } from "@/lib/reports/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { CategoryChart, MethodChart, TrendChart } from "./charts";
import { DateRangeBar } from "./date-range-bar";
import { CashiersTable, TopProductsTable, VatTable } from "./tables";
import { Change, KpiCard } from "../dashboard/kpi-cards";

const money = (v: string) => formatKsh(toCents(v));

export function ReportsManager({
  initial,
  initialRange,
}: {
  initial: ReportsBundle;
  initialRange: Range;
}) {
  const call = useApi();
  const [bundle, setBundle] = useState(initial);
  const [range, setRange] = useState(initialRange);
  const [preset, setPreset] = useState<Preset>("7d");
  const [by, setBy] = useState<TopBy>("revenue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the server already loaded the first range
      return;
    }
    const mine = ++latest.current; // ignore answers that arrive after a newer request
    setLoading(true);
    loadReports(call, range, by)
      .then((b) => {
        if (mine === latest.current) {
          setBundle(b);
          setError(null);
        }
      })
      .catch((e) => {
        if (mine === latest.current)
          setError(
            e instanceof Error ? e.message : "Could not load the reports",
          );
      })
      .finally(() => {
        if (mine === latest.current) setLoading(false);
      });
  }, [call, range, by, tick]);

  function pick(p: FixedPreset) {
    setPreset(p);
    setRangeError(null);
    setRange(rangeFor(p));
  }

  function custom(next: Range) {
    setPreset("custom");
    if (next.from > next.to)
      return setRangeError("The start date must be on or before the end date");
    if (spanDays(next) > 366)
      return setRangeError("Choose a period of up to a year");
    setRangeError(null);
    setRange(next);
  }

  const { overview: o } = bundle;
  const file = `${range.from}_to_${range.to}`;
  const versus = "vs previous period";

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Reports"
        description="Sales, margins, VAT and payment breakdowns."
        actions={
          <Link
            href="/reports/unclaimed"
            className={buttonVariants({
              variant: "outline",
              className: "h-11",
            })}
          >
            Unclaimed M-Pesa
          </Link>
        }
      />

      <DateRangeBar
        preset={preset}
        range={range}
        error={rangeError}
        onPreset={pick}
        onCustom={custom}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {error}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTick((t) => t + 1)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn("grid gap-6 transition-opacity", loading && "opacity-60")}
        aria-busy={loading}
      >
        <section
          aria-label="Summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Total sales"
            value={money(o.revenue)}
            icon={CircleDollarSign}
            tone="teal"
          >
            <Change value={o.change.revenue} versus={versus} />
            {o.voids.count > 0 && (
              <span>
                Voided: {o.voids.count} ({money(o.voids.value)})
              </span>
            )}
          </KpiCard>
          <KpiCard
            label="Transactions"
            value={String(o.transactions)}
            icon={Receipt}
            tone="blue"
          >
            <Change value={o.change.transactions} versus={versus} />
            <span>{o.itemsSold} items sold</span>
          </KpiCard>
          <KpiCard
            label="Average basket"
            value={money(o.avgBasket)}
            icon={ShoppingBasket}
            tone="amber"
          >
            <span>Per transaction</span>
          </KpiCard>
          <KpiCard
            label="Gross profit"
            value={money(o.grossProfit)}
            icon={Percent}
            tone="violet"
          >
            <Change value={o.change.grossProfit} versus={versus} />
            <span>
              {o.marginPct === null
                ? "No margin yet"
                : `Margin ${o.marginPct}% (excl. VAT)`}
            </span>
          </KpiCard>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Sales over time</CardTitle>
            <CardDescription>{money(o.revenue)} in this period</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={bundle.trend} interval={intervalFor(range)} />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales by category</CardTitle>
              <CardDescription>
                By each product&apos;s current category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryChart rows={bundle.categories} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment methods</CardTitle>
              <CardDescription>Where the money came in</CardDescription>
            </CardHeader>
            <CardContent>
              <MethodChart rows={bundle.methods} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TopProductsTable
            rows={bundle.top}
            by={by}
            onBy={setBy}
            file={file}
          />
          <VatTable tax={bundle.tax} file={file} />
        </div>

        <CashiersTable rows={bundle.cashiers} file={file} />
      </div>
    </div>
  );
}
