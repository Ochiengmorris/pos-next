import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSaleTime } from "@/lib/dashboard/format";
import type { DashboardData } from "@/lib/dashboard/types";
import { formatKsh, toCents } from "@/lib/pos/money";
import { cn } from "@/lib/utils";

const money = (v: string) => formatKsh(toCents(v));
const METHOD: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MPESA: "M-Pesa",
};

export function TopSellers({
  items,
}: {
  items: DashboardData["weekTopProducts"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top sellers</CardTitle>
        <CardDescription>Last 7 days, by sales</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sales in the last 7 days.
          </p>
        ) : (
          <ol className="grid gap-1">
            {items.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {money(p.revenue)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {p.quantitySold} sold
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentSales({
  rows,
  today,
}: {
  rows: DashboardData["recentSales"];
  today: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent sales</CardTitle>
        <CardDescription>The latest 10 transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sales yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="hidden md:table-cell">Cashier</TableHead>
                <TableHead className="hidden sm:table-cell">Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const voided = s.status !== "COMPLETED";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.receiptNo}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatSaleTime(s.createdAt, today)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {s.cashier}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {s.methods.map((m) => METHOD[m] ?? m).join(" + ")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        voided && "text-muted-foreground line-through",
                      )}
                    >
                      {money(s.total)}
                    </TableCell>
                    <TableCell>
                      {voided ? (
                        <Badge variant="destructive">
                          {s.status === "VOIDED" ? "Voided" : "Refunded"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function LowStock({
  items,
  inventory,
}: {
  items: DashboardData["lowStock"];
  inventory: DashboardData["inventory"];
}) {
  const needing = inventory.lowStock + inventory.outOfStock;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs restocking</CardTitle>
        <CardDescription>
          {needing === 0
            ? "Everything is above its reorder level"
            : `${needing} ${needing === 1 ? "product is" : "products are"} at or below the reorder level`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-teal-700" aria-hidden /> All
            stocked up
          </p>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Reorder at {p.reorderLevel}
                  </span>
                </span>
                {p.stockQty <= 0 ? (
                  <Badge variant="destructive">Out of stock</Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-amber-800"
                  >
                    {p.stockQty} left
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/inventory"
          className={buttonVariants({ variant: "outline" })}
        >
          Manage stock
        </Link>

        <p className="text-xs text-muted-foreground">
          {inventory.totalUnits.toLocaleString("en-GB")} units across{" "}
          {inventory.activeProducts} products. Stock value{" "}
          {money(inventory.stockValueAtCost)} at cost,{" "}
          {money(inventory.stockValueAtRetail)} at retail.
        </p>
      </CardContent>
    </Card>
  );
}
