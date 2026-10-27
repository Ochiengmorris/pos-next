"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CircleCheck,
  Download,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type CsvCell, downloadCsv, downloadText } from "@/lib/csv";
import type { ImportReport } from "@/lib/products/import-types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const TEMPLATE: CsvCell[][] = [
  [
    "sku",
    "barcode",
    "name",
    "category",
    "price",
    "cost",
    "vat_class",
    "reorder_level",
    "stock",
  ],
  [
    "SUGAR-1KG",
    "6001234500011",
    "Sugar 1kg",
    "Groceries",
    210,
    180,
    "B",
    10,
    40,
  ],
  [
    "SUGAR-HALF",
    "6001234500028",
    "Sugar 1/2kg",
    "Groceries",
    110,
    95,
    "B",
    10,
    40,
  ],
  [
    "SODA-500",
    "6001234500035",
    "Soda 500ml",
    "Beverages",
    70,
    50,
    "B",
    24,
    120,
  ],
];

export function ImportWizard() {
  const call = useApi();
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [done, setDone] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const latest = useRef(0);

  async function send(dryRun: boolean): Promise<ImportReport> {
    const body = new FormData();
    body.append("file", file!);
    const qs = new URLSearchParams({
      dryRun: String(dryRun),
      updateExisting: String(updateExisting),
      skipInvalid: String(skipInvalid),
    });
    return call<ImportReport>(`/products/import?${qs}`, {
      method: "POST",
      body,
    });
  }

  // Every change of file or option re-runs the preview, so what you see is what Import will do
  useEffect(() => {
    if (!file) return;
    const mine = ++latest.current;
    setBusy("preview"); // To be fixed
    setError(null);
    setReport(null);
    setDone(null);
    send(true)
      .then((r) => mine === latest.current && setReport(r))
      .catch(
        (e) =>
          mine === latest.current &&
          setError(e instanceof Error ? e.message : "Could not read the file"),
      )
      .finally(() => mine === latest.current && setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, updateExisting, skipInvalid]);

  async function runImport() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    setConfirm(false);
    setBusy("import");
    setError(null);
    try {
      const r = await send(false);
      if (r.applied) setDone(r);
      else setReport(r);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The import failed. Nothing was saved.",
      );
    } finally {
      setBusy(null);
    }
  }

  const t = report?.totals;
  const blocked = !!t && t.error > 0 && !skipInvalid;
  const todo = t ? t.create + t.update : 0;
  const unreviewed = done?.notices.some((n) => n.includes("VAT")) ?? false;

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Import products"
        description="Add or update many products from a spreadsheet."
      />

      {done ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="size-5 text-teal-700" aria-hidden />{" "}
              Import complete
            </CardTitle>
            <CardDescription>
              {done.totals.create} created, {done.totals.update} updated
              {done.totals.skip ? `, ${done.totals.skip} left unchanged` : ""}
              {done.totals.error
                ? `, ${done.totals.error} skipped because of errors`
                : ""}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {done.notices.map((n) => (
              <p key={n} className="text-sm">
                {n}
              </p>
            ))}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/products"
                className={buttonVariants({ className: "h-11" })}
              >
                Go to products
              </Link>
              {unreviewed && (
                <Link
                  href="/etims"
                  className={buttonVariants({
                    variant: "outline",
                    className: "h-11",
                  })}
                >
                  Review VAT classes
                </Link>
              )}
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => {
                  setDone(null);
                  setFile(null);
                  setReport(null);
                }}
              >
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>1. Prepare your file</CardTitle>
              <CardDescription>
                Columns: <code>sku</code> (or <code>barcode</code>),{" "}
                <code>name</code>, <code>price</code>, and optionally{" "}
                <code>category</code>, <code>cost</code>, <code>vat_class</code>{" "}
                (A to E), <code>reorder_level</code>, <code>stock</code>. Save
                as CSV. Format barcode columns as <strong>Text</strong> first,
                so Excel doesn&apos;t mangle them. Sell pre-packed weights as
                separate products, such as &quot;Sugar 1kg&quot; and &quot;Sugar
                1/2kg&quot;, each with its own barcode and price.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() =>
                  downloadCsv("product-import-template.csv", TEMPLATE)
                }
              >
                <Download aria-hidden /> Download template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={async () => {
                  try {
                    downloadText(
                      "products.csv",
                      await call<string>("/products/export"),
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Could not export",
                    );
                  }
                }}
              >
                <Download aria-hidden /> Download my current products
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Choose the file</CardTitle>
              <CardDescription>
                You will see a full preview before anything is saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="csv-file">
                  CSV file (up to 5 MB, 20,000 rows)
                </Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="h-11 bg-card"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="opt-update"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                  <Label htmlFor="opt-update">
                    Update products that already exist (matched by SKU)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="opt-skip"
                    checked={skipInvalid}
                    onCheckedChange={setSkipInvalid}
                  />
                  <Label htmlFor="opt-skip">
                    Skip rows with errors instead of stopping
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {busy === "preview" && (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden /> Checking the
          file…
        </p>
      )}

      {report && !done && t && (
        <Card>
          <CardHeader>
            <CardTitle>3. Review</CardTitle>
            <CardDescription>
              {t.rows} rows read. Nothing has been saved yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Will be created", t.create, "text-teal-700"],
                  ["Will be updated", t.update, "text-blue-700"],
                  ["Left unchanged", t.skip, "text-muted-foreground"],
                  [
                    "Errors",
                    t.error,
                    t.error ? "text-red-700" : "text-muted-foreground",
                  ],
                ] as const
              ).map(([label, n, tone]) => (
                <div
                  key={label}
                  className="rounded-lg border border-secondary/20 p-3"
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd
                    className={cn("text-2xl font-semibold tabular-nums", tone)}
                  >
                    {n}
                  </dd>
                </div>
              ))}
            </dl>

            {report.newCategories.length > 0 && (
              <p className="text-sm">
                <strong>New categories to be created:</strong>{" "}
                {report.newCategories.join(", ")}
              </p>
            )}

            {report.notices.map((n) => (
              <Alert key={n}>
                <Info aria-hidden />
                <AlertDescription className="text-foreground">
                  {n}
                </AlertDescription>
              </Alert>
            ))}

            {report.rows.length > 0 && (
              <div className="rounded-lg border border-secondary/20">
                <Table>
                  <caption className="sr-only">
                    Rows with problems or warnings
                  </caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>What we found</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((r) => (
                      <TableRow key={r.row}>
                        <TableCell className="tabular-nums">{r.row}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {r.name || "(no name)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.errors.map((m) => (
                            <p key={m} className="font-medium text-red-700">
                              Error: {m}
                            </p>
                          ))}
                          {r.warnings.map((m) => (
                            <p key={m} className="text-amber-800">
                              Note: {m}
                            </p>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {report.truncated && (
                  <p className="border-t p-3 text-xs text-muted-foreground">
                    Showing the first rows only. Download the full list below.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="h-11"
                disabled={blocked || todo === 0 || busy !== null}
                aria-busy={busy === "import"}
                variant={confirm ? "destructive" : "default"}
                onClick={() => void runImport()}
              >
                {busy === "import" ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Upload aria-hidden />
                )}
                {busy === "import"
                  ? "Importing…"
                  : confirm
                    ? "Tap again to confirm"
                    : `Import ${todo} ${todo === 1 ? "product" : "products"}`}
              </Button>
              {report.rows.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() =>
                    downloadCsv("import-problems.csv", [
                      ["row", "sku", "name", "errors", "notes"],
                      ...report.rows.map((r): CsvCell[] => [
                        r.row,
                        r.sku,
                        r.name,
                        r.errors.join("; "),
                        r.warnings.join("; "),
                      ]),
                    ])
                  }
                >
                  <Download aria-hidden /> Download the problem list
                </Button>
              )}
              {blocked && (
                <span className="text-sm text-red-700">
                  Fix the errors in your file, or switch on &quot;Skip rows with
                  errors&quot;.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
