"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Pager } from "@/components/ui/pager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounced } from "@/hooks/use-debounced";
import type { ReviewProduct, TaxTypeRow } from "@/lib/etims/types";
import { formatKsh, toCents } from "@/lib/pos/money";
import { useApi } from "@/lib/use-api";

type Page = {
  items: ReviewProduct[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export function TaxReviewPanel({
  isAdmin,
  onChanged,
}: {
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const call = useApi();
  const [types, setTypes] = useState<TaxTypeRow[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    key: string;
    page: Page | null;
  } | null>(null);
  const [all, setAll] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmAll, setConfirmAll] = useState(false);
  const [typesTick, setTypesTick] = useState(0);
  const [productsTick, setProductsTick] = useState(0);
  const debounced = useDebounced(search, 250);

  const query = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(page),
      limit: "20",
      all: String(all),
    });
    if (debounced.trim()) qs.set("search", debounced.trim());
    return qs.toString();
  }, [page, all, debounced]);

  const requestKey = `${query}#${productsTick}`;
  const loading = result?.key !== requestKey; // derived, no setState needed
  const data = result?.page ?? null;

  useEffect(() => {
    let cancelled = false;
    call<TaxTypeRow[]>("/etims/tax-types")
      .then((t) => {
        if (cancelled) return;
        setTypes(t);
        setRates(
          Object.fromEntries(t.map((x) => [x.code, String(Number(x.rate))])),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load the tax classes");
      });
    return () => {
      cancelled = true;
    };
  }, [call, typesTick]);

  useEffect(() => {
    let cancelled = false;
    call<Page>(`/etims/tax-review?${query}`)
      .then((p) => {
        if (!cancelled) setResult({ key: requestKey, page: p });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Could not load products");
        // keep the previous rows, but mark this request as finished
        setResult((prev) => ({ key: requestKey, page: prev?.page ?? null }));
      });
    return () => {
      cancelled = true;
    };
  }, [call, query, requestKey]);

  const label = (t: TaxTypeRow) =>
    `${t.code} · ${t.name.replace(/^[A-E] - /, "")} (${Number(t.rate)}%)`;

  async function changeClass(p: ReviewProduct, code: string) {
    try {
      await call(`/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ taxTyCd: code }),
      });
      toast.success(`${p.name} is now class ${code}`);
      setProductsTick((t) => t + 1);
      onChanged();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not change the class",
      );
    }
  }

  async function confirm(ids: string[]) {
    try {
      const r = await call<{ confirmed: number }>("/etims/tax-review/confirm", {
        method: "POST",
        body: JSON.stringify({ productIds: ids }),
      });
      toast.success(`${r.confirmed} confirmed`);
      setProductsTick((t) => t + 1);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm");
    }
  }

  async function saveRate(code: string) {
    try {
      await call(`/etims/tax-types/${code}`, {
        method: "PATCH",
        body: JSON.stringify({ rate: Number(rates[code]) }),
      });
      toast.success(
        `Class ${code} rate updated. It applies to sales from now on.`,
      );
      setTypesTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the rate");
    }
  }

  const unconfirmedShown = (data?.items ?? []).filter((p) => !p.taxConfirmed);

  return (
    <div className="grid gap-6">
      <Alert>
        <AlertDescription className="text-foreground">
          Classes <strong>A (exempt)</strong>, <strong>C (zero-rated)</strong>{" "}
          and <strong>D (non-VAT)</strong> all charge 0%, but they are reported
          in different places on your VAT return. Existing 0% products were set
          to A as a placeholder. Please review each one with your accountant.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Tax classes and rates</CardTitle>
          <CardDescription>
            KRA publishes these.{" "}
            {isAdmin
              ? "Changing a rate affects sales from now on and is recorded in the audit log."
              : "Only an administrator can change a rate."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Rate %</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.code}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Input
                        aria-label={`Rate for class ${t.code}`}
                        inputMode="decimal"
                        className="ml-auto h-10 w-24 text-right"
                        value={rates[t.code] ?? ""}
                        onChange={(e) =>
                          setRates((r) => ({ ...r, [t.code]: e.target.value }))
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{Number(t.rate)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={
                          Number(rates[t.code]) === Number(t.rate) ||
                          !/^\d{1,3}(\.\d{1,2})?$/.test(rates[t.code] ?? "")
                        }
                        onClick={() => void saveRate(t.code)}
                      >
                        Save
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Product VAT classes</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              aria-label="Search products"
              placeholder="Search name or SKU…"
              className="h-11 max-w-xs bg-card"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="tr-all"
                checked={all}
                onCheckedChange={(c) => {
                  setAll(c);
                  setPage(1);
                }}
              />
              <Label htmlFor="tr-all">Show reviewed products too</Label>
            </div>
            {unconfirmedShown.length > 0 && (
              <Button
                type="button"
                variant={confirmAll ? "destructive" : "outline"}
                className="h-11"
                onClick={() => {
                  if (!confirmAll) {
                    setConfirmAll(true);
                    setTimeout(() => setConfirmAll(false), 4000);
                    return;
                  }
                  setConfirmAll(false);
                  void confirm(unconfirmedShown.map((p) => p.id));
                }}
              >
                {confirmAll
                  ? `Tap again: confirm ${unconfirmedShown.length} as shown`
                  : `Confirm these ${unconfirmedShown.length} as shown`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div
            className={
              loading ? "opacity-60 transition-opacity" : "transition-opacity"
            }
            aria-busy={loading}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Price
                  </TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Review</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {loading ? "Loading…" : "Nothing left to review."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data!.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.sku}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatKsh(toCents(p.price))}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.taxTyCd}
                          onValueChange={(v) =>
                            v && v !== p.taxTyCd && void changeClass(p, v)
                          }
                        >
                          <SelectTrigger
                            className="h-10 w-56"
                            aria-label={`VAT class for ${p.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map((t) => (
                              <SelectItem key={t.code} value={t.code}>
                                {label(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.taxConfirmed ? (
                          <span className="text-sm text-muted-foreground">
                            Reviewed
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => void confirm([p.id])}
                          >
                            Confirm
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {data && (
            <Pager
              meta={data.meta}
              count={data.items.length}
              loading={loading}
              onPage={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
