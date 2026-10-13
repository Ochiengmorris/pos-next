"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type CsvCell, downloadCsv } from "@/lib/csv";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { CashierRow, TaxData, TopBy, TopRow } from "@/lib/reports/types";

const money = (v: string) => formatKsh(toCents(v));

function ExportButton({
  filename,
  rows,
}: {
  filename: string;
  rows: CsvCell[][];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9"
      onClick={() => downloadCsv(filename, rows)}
    >
      <Download aria-hidden /> Export CSV
    </Button>
  );
}

const BY: { id: TopBy; label: string }[] = [
  { id: "revenue", label: "Sales" },
  { id: "quantity", label: "Quantity" },
  { id: "profit", label: "Profit" },
];

export function TopProductsTable({
  rows,
  by,
  onBy,
  file,
}: {
  rows: TopRow[];
  by: TopBy;
  onBy: (b: TopBy) => void;
  file: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Top products</CardTitle>
            <CardDescription>The best ten in this period</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Rank by"
              className="flex gap-1 rounded-lg border bg-card p-1"
            >
              {BY.map((b) => (
                <Button
                  key={b.id}
                  type="button"
                  size="sm"
                  variant={by === b.id ? "default" : "ghost"}
                  aria-pressed={by === b.id}
                  className="h-9"
                  onClick={() => onBy(b.id)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
            <ExportButton
              filename={`top-products-${file}.csv`}
              rows={[
                [
                  "Product",
                  "SKU",
                  "Quantity sold",
                  "Sales",
                  "Gross profit (excl. VAT)",
                ],
                ...rows.map((r): CsvCell[] => [
                  r.name,
                  r.sku,
                  r.quantitySold,
                  Number(r.revenue),
                  Number(r.grossProfit),
                ]),
              ]}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sales in this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Profit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.sku}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.quantitySold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.revenue)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {money(r.grossProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function VatTable({ tax, file }: { tax: TaxData; file: string }) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>VAT summary</CardTitle>
            <CardDescription>
              VAT included in sales, by the rate applied at the time of sale.
              Not a tax return.
            </CardDescription>
          </div>
          <ExportButton
            filename={`vat-${file}.csv`}
            rows={[
              ["VAT rate %", "Net sales", "VAT", "Gross sales"],
              ...tax.byRate.map((r): CsvCell[] => [
                Number(r.rate),
                Number(r.netSales),
                Number(r.vat),
                Number(r.gross),
              ]),
              [
                "Total",
                Number(tax.totals.netSales),
                Number(tax.totals.vat),
                Number(tax.totals.gross),
              ],
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        {tax.byRate.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sales in this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VAT rate</TableHead>
                <TableHead className="text-right">Net sales</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Gross sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tax.byRate.map((r) => (
                <TableRow key={r.rate}>
                  <TableCell className="font-medium">
                    {Number(r.rate)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.netSales)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.vat)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.gross)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {money(tax.totals.netSales)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {money(tax.totals.vat)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {money(tax.totals.gross)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function CashiersTable({
  rows,
  file,
}: {
  rows: CashierRow[];
  file: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Cashier performance</CardTitle>
            <CardDescription>Completed sales per cashier</CardDescription>
          </div>
          <ExportButton
            filename={`cashiers-${file}.csv`}
            rows={[
              ["Cashier", "Transactions", "Sales", "Average basket"],
              ...rows.map((r): CsvCell[] => [
                r.name,
                r.transactions,
                Number(r.revenue),
                Number(r.avgBasket),
              ]),
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sales in this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Average basket
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.transactions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.revenue)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {money(r.avgBasket)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
