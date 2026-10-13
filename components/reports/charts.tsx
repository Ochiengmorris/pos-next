"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { bucketLabel, formatCompact } from "@/lib/dashboard/format";
import type { TrendPoint } from "@/lib/dashboard/types";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { CategoryRow, MethodRow } from "@/lib/reports/types";

const ksh = (n: number) => formatKsh(Math.round(n * 100));
const empty = (
  <p className="py-16 text-center text-sm text-muted-foreground">
    No sales in this period.
  </p>
);

// ---- sales over time ----
const trendConfig = {
  revenue: { label: "Sales", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TrendChart({
  data,
  interval,
}: {
  data: TrendPoint[];
  interval: "hour" | "day" | "month";
}) {
  if (data.every((p) => Number(p.revenue) === 0)) return empty;
  const points = data.map((p) => ({
    label: bucketLabel(p.bucket, interval),
    revenue: Number(p.revenue),
  }));
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
      <AreaChart
        accessibilityLayer
        data={points}
        margin={{ left: 4, right: 12, top: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => formatCompact(Number(v))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-6">
                  <span className="text-muted-foreground">Sales</span>
                  <span className="font-medium tabular-nums">
                    {ksh(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="var(--color-revenue)"
          fillOpacity={0.15}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// ---- sales by category ----
const categoryConfig = { revenue: { label: "Sales" } } satisfies ChartConfig;
type CatPoint = { name: string; revenue: number; quantity: number };

export function CategoryChart({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) return empty;
  const points: CatPoint[] = rows.map((r) => ({
    name: r.category,
    revenue: Number(r.revenue),
    quantity: r.quantitySold,
  }));
  return (
    <div className="grid gap-4">
      <ChartContainer
        config={categoryConfig}
        className="aspect-auto h-56 w-full"
      >
        <BarChart
          accessibilityLayer
          data={points}
          margin={{ left: 4, right: 8, top: 8 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            tickFormatter={(v: string) =>
              v.length > 10 ? `${v.slice(0, 9)}…` : v
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const row = item.payload as CatPoint;
                  return (
                    <div className="grid gap-0.5">
                      <span className="font-medium">{row.name}</span>
                      <span className="tabular-nums">{ksh(Number(value))}</span>
                      <span className="text-muted-foreground">
                        {row.quantity} sold
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="revenue" radius={6}>
            {points.map((p, i) => (
              <Cell key={p.name} fill={`var(--chart-${(i % 5) + 1})`} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {/* the same numbers as text: the chart is never the only way to read them */}
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {points.map((p, i) => (
          <li key={p.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 rounded-sm"
                style={{ background: `var(--chart-${(i % 5) + 1})` }}
              />
              {p.name}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {ksh(p.revenue)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- payment methods ----
const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
};
const methodConfig = {
  CASH: { label: "Cash", color: "var(--chart-1)" },
  MPESA: { label: "M-Pesa", color: "var(--chart-2)" },
  CARD: { label: "Card", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function MethodChart({ rows }: { rows: MethodRow[] }) {
  const data = rows
    .map((r) => ({ method: r.method, value: Number(r.amount) }))
    .filter((r) => r.value > 0);
  if (data.length === 0) return empty;
  const totalCents = rows.reduce((s, r) => s + toCents(r.amount), 0);

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <ChartContainer
        config={methodConfig}
        className="mx-auto aspect-square h-48"
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-6">
                    <span className="text-muted-foreground">
                      {METHOD_LABEL[String(name)] ?? name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {ksh(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="method"
            innerRadius={52}
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.method} fill={`var(--color-${d.method})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid gap-2 text-sm">
        {rows.map((r) => {
          const pct =
            totalCents === 0
              ? 0
              : Math.round((toCents(r.amount) / totalCents) * 1000) / 10;
          return (
            <li
              key={r.method}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 rounded-sm"
                  style={{ background: `var(--color-${r.method})` }}
                />
                {METHOD_LABEL[r.method] ?? r.method}
                <span className="text-muted-foreground">{pct}%</span>
              </span>
              <span className="tabular-nums">
                {formatKsh(toCents(r.amount))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
