import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONES = {
  teal: { icon: "bg-success-soft text-success" },
  blue: { icon: "bg-accent text-accent-foreground" },
  amber: { icon: "bg-warning-soft text-warning" },
  red: { icon: "bg-destructive-soft text-destructive" },
  violet: { icon: "bg-secondary text-secondary-foreground" },
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
    <Card className="gap-0 py-5">
      <CardContent className="grid gap-3 px-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span
            className={cn("grid size-8 place-items-center rounded-lg", t.icon)}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          {label}
        </div>
        <p className="figure text-3xl font-semibold tracking-tight">{value}</p>
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
