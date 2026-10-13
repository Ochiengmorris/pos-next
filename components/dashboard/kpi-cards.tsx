import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONES = {
  teal: { card: "border-teal-100 bg-teal-50", icon: "text-teal-700" },
  blue: { card: "border-blue-100 bg-blue-50", icon: "text-blue-700" },
  amber: { card: "border-amber-100 bg-amber-50", icon: "text-amber-700" },
  red: { card: "border-red-100 bg-red-50", icon: "text-red-700" },
  violet: { card: "border-violet-100 bg-violet-50", icon: "text-violet-700" },
} as const;

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  children?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn("gap-0 py-5", t.card)}>
      <CardContent className="grid gap-3 px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg bg-white",
              t.icon,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          {label}
        </div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        <div className="grid gap-0.5 text-sm text-muted-foreground">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// direction is stated in words and an arrow, not only color
export function Change({
  value,
  versus = "vs yesterday",
}: {
  value: number | null;
  versus?: string;
}) {
  if (value === null) return <span>No comparison yet</span>;
  if (value === 0) return <span>No change {versus}</span>;
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        up ? "text-teal-700" : "text-red-700",
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      {Math.abs(value)}% {versus}
    </span>
  );
}
