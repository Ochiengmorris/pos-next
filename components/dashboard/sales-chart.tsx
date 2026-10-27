"use client";

import { useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { addDays, bucketLabel, formatCompact } from "@/lib/dashboard/format";
import type { TrendPoint } from "@/lib/dashboard/types";
import { formatKsh, toCents } from "@/lib/pos/money";
import { useApi } from "@/lib/use-api";

type Range = "today" | "7d" | "30d";

const RANGES: { id: Range; label: string; description: string }[] = [
  { id: "today", label: "Today", description: "today, by hour" },
  { id: "7d", label: "7 days", description: "the last 7 days" },
  { id: "30d", label: "30 days", description: "the last 30 days" },
];

const config = {
  revenue: { label: "Sales", color: "var(--chart-2)" },
} satisfies ChartConfig;

function queryFor(range: Range, today: string): string {
  if (range === "today") return `from=${today}&to=${today}`; // the API picks hourly buckets for one day
  const days = range === "7d" ? 6 : 29;
  return `from=${addDays(today, -days)}&to=${today}&interval=day`;
}

export function SalesChart({
  today,
  initial,
}: {
  today: string;
  initial: TrendPoint[];
}) {
  const call = useApi();
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  async function select(next: Range) {
    setRange(next);
    setLoading(true);
    setError(null);
    const mine = ++latest.current; // ignore answers that arrive after a newer click
    try {
      const rows = await call<TrendPoint[]>(
        `/reports/trend?${queryFor(next, today)}`,
      );
      if (mine === latest.current) setData(rows);
    } catch (e) {
      if (mine === latest.current)
        setError(e instanceof Error ? e.message : "Could not load the chart");
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }

  const interval = range === "today" ? "hour" : "day";
  const points = data.map((p) => ({
    label: bucketLabel(p.bucket, interval),
    revenue: Number(p.revenue),
  }));
  const totalCents = data.reduce((s, p) => s + toCents(p.revenue), 0);
  const current = RANGES.find((r) => r.id === range)!;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Sales overview</CardTitle>
            <CardDescription>
              {formatKsh(totalCents)} in {current.description}
            </CardDescription>
          </div>
          <div
            role="group"
            aria-label="Chart period"
            className="flex gap-1 rounded-lg bg-card p-1"
          >
            {RANGES.map((r) => (
              <Button
                key={r.id}
                type="button"
                size="sm"
                variant={range === r.id ? "default" : "ghost"}
                aria-pressed={range === r.id}
                className="h-9"
                onClick={() => void select(r.id)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div
          className={
            loading ? "opacity-60 transition-opacity" : "transition-opacity"
          }
          aria-busy={loading}
        >
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
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
                          {formatKsh(Math.round(Number(value) * 100))}
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
        </div>
      </CardContent>
    </Card>
  );
}
