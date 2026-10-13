// components/inventory/movements-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pager } from "@/components/ui/pager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  endOfDayISO,
  formatDateTime,
  startOfDayISO,
} from "@/lib/dashboard/format";
import { MOVEMENT_LABEL, type MovementsPage } from "@/lib/inventory/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "../app/date-range-picker";

export function MovementsPanel({
  product,
  onClearProduct,
}: {
  product: { id: string; name: string } | null;
  onClearProduct: () => void;
}) {
  const call = useApi();
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MovementsPage | null>(null);
  const [completedUrl, setCompletedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qs = new URLSearchParams({ page: String(page), limit: "6" });
  if (product) qs.set("productId", product.id);
  if (type !== "all") qs.set("type", type);
  if (from) qs.set("from", startOfDayISO(from));
  if (to) qs.set("to", endOfDayISO(to));
  const requestUrl = `/inventory/movements?${qs}`;
  const loading = completedUrl !== requestUrl;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await call<MovementsPage>(requestUrl);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not load the history",
          );
      } finally {
        if (!cancelled) setCompletedUrl(requestUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, requestUrl]);

  const items = data?.items ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-11 w-44 bg-card"
            aria-label="Filter by type"
          >
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(MOVEMENT_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* <label className="flex items-center gap-2 text-sm">
          From
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-11 w-40 bg-card"
            aria-label="From date"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          To
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-11 w-40 bg-card"
            aria-label="To date"
          />
        </label> */}

        <DateRangePicker
          from={from}
          to={to}
          onChange={({ from, to }) => {
            setFrom(from);
            setTo(to);
            setPage(1);
          }}
        />

        {product && (
          <Badge variant="secondary" className="h-9 gap-2 pl-3 pr-1 text-sm">
            {product.name}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Show all products"
              onClick={() => {
                onClearProduct();
                setPage(1);
              }}
            >
              <X aria-hidden />
            </Button>
          </Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          "rounded-xl border bg-card shadow-sm transition-opacity",
          loading && "opacity-60",
        )}
        aria-busy={loading}
      >
        <Table>
          <caption className="sr-only">Stock movements</caption>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="hidden md:table-cell">Reason</TableHead>
              <TableHead className="hidden lg:table-cell">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-16 text-center text-muted-foreground"
                >
                  {loading ? "Loading…" : "No movements match."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{m.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.product.sku}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{MOVEMENT_LABEL[m.type]}</Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      m.quantity < 0 ? "text-red-700" : "text-teal-700",
                    )}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {m.reason ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {m.user?.name ?? "—"}
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
          count={items.length}
          loading={loading}
          onPage={setPage}
        />
      )}
    </div>
  );
}
