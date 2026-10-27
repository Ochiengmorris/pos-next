import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  PackageX,
  Receipt,
  TrendingUp,
} from "lucide-react";
// import { Change, KpiCard } from "@/components/dashboard/kpi-card";
// import { LowStock, RecentSales, TopSellers } from "@/components/dashboard/panels";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api.server";
import { formatLongDate } from "@/lib/dashboard/format";
import type { DashboardData } from "@/lib/dashboard/types";
import { formatKsh, toCents } from "@/lib/pos/money";
import { requireSession } from "@/lib/session";
import { Change, KpiCard } from "@/components/dashboard/kpi-cards";
import {
  LowStock,
  RecentSales,
  TopSellers,
} from "@/components/dashboard/pamels";
import Link from "next/link";

const money = (v: string) => formatKsh(toCents(v));

export default async function DashboardPage() {
  const session = await requireSession(["MANAGER"]);
  const d = await api<DashboardData>("/reports/dashboard");

  const t = d.today;
  const today = t.range.to; // the business date, from the API
  const needsAttention = d.inventory.lowStock + d.inventory.outOfStock;
  const firstName = session.user.name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        description="Here's what's happening in your store today."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-secondary/10 bg-card px-3 py-2 text-sm">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden
            />
            {formatLongDate(today)}
          </div>
        }
      />

      {d.alerts.unclaimedMpesa > 0 && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>
            {d.alerts.unclaimedMpesa} M-Pesa{" "}
            {d.alerts.unclaimedMpesa === 1 ? "payment was" : "payments were"}{" "}
            received but not attached to any sale.{" "}
            <Link
              href="/reports/unclaimed"
              className="font-medium underline underline-offset-2"
            >
              Review them
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}
      {d.alerts.etimsAttention > 0 && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>
            {d.alerts.etimsAttention} tax{" "}
            {d.alerts.etimsAttention === 1 ? "invoice needs" : "invoices need"}{" "}
            attention.{" "}
            <Link
              href="/etims"
              className="font-medium underline underline-offset-2"
            >
              Open the eTIMS screen
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <section
        aria-label="Today at a glance"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Total sales"
          value={money(t.revenue)}
          icon={CircleDollarSign}
          tone="teal"
        >
          <Change value={t.change.revenue} />
          <span>Average basket {money(t.avgBasket)}</span>
          {t.voids.count > 0 && (
            <span>
              Voided: {t.voids.count} ({money(t.voids.value)})
            </span>
          )}
        </KpiCard>

        <KpiCard
          label="Transactions"
          value={String(t.transactions)}
          icon={Receipt}
          tone="blue"
        >
          <Change value={t.change.transactions} />
          <span>{t.itemsSold} items sold</span>
        </KpiCard>

        <KpiCard
          label="Gross profit"
          value={money(t.grossProfit)}
          icon={TrendingUp}
          tone="amber"
        >
          <Change value={t.change.grossProfit} />
          <span>
            {t.marginPct === null
              ? "No margin yet"
              : `Margin ${t.marginPct}% (excl. VAT)`}
          </span>
        </KpiCard>

        <KpiCard
          label="Low stock"
          value={`${needsAttention} ${needsAttention === 1 ? "item" : "items"}`}
          icon={PackageX}
          tone="red"
        >
          <span>
            {needsAttention === 0
              ? "All above reorder level"
              : "Needs attention"}
          </span>
          {d.inventory.outOfStock > 0 && (
            <span>{d.inventory.outOfStock} out of stock</span>
          )}
        </KpiCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SalesChart today={today} initial={d.weekTrend} />
        <TopSellers items={d.weekTopProducts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RecentSales rows={d.recentSales} today={today} />
        <LowStock items={d.lowStock} inventory={d.inventory} />
      </div>
    </div>
  );
}
