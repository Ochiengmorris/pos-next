"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { EtimsBadge } from "@/components/etims/etims-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { useDebounced } from "@/hooks/use-debounced";
import {
  endOfDayISO,
  formatDateTime,
  startOfDayISO,
} from "@/lib/dashboard/format";
import type { EtimsSummary, InvoicesPage } from "@/lib/etims/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { InvoiceDialog } from "./invoice-dialog";
import { DateRangePicker } from "../app/date-range-picker";

const STATUSES = [
  ["all", "All statuses"],
  ["ATTENTION", "Needs attention"],
  ["PENDING", "Pending"],
  ["ACCEPTED", "Accepted"],
  ["REJECTED", "Rejected"],
  ["FAILED", "Could not be sent"],
  ["UNCERTAIN", "Outcome unknown"],
  ["CANCELLED", "Cancelled"],
] as const;

const RAW: Record<string, string> = {
  REJECTED: "Rejected",
  FAILED: "Could not send",
  UNCERTAIN: "Outcome unknown",
};

type Props = {
  initial: InvoicesPage;
  summary: EtimsSummary;
  isAdmin: boolean;
  onChanged: () => void;
};

export function InvoicesPanel({ initial, summary, isAdmin, onChanged }: Props) {
  const call = useApi();
  const [data, setData] = useState(initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const debounced = useDebounced(search, 250);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({ page: String(page), limit: "4" });
        if (debounced.trim()) qs.set("search", debounced.trim());
        if (status !== "all") qs.set("status", status);
        if (type !== "all") qs.set("type", type);
        if (from) qs.set("from", startOfDayISO(from));
        if (to) qs.set("to", endOfDayISO(to));
        const res = await call<InvoicesPage>(`/etims/invoices?${qs}`);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, debounced, status, type, from, to, page, tick]);

  const reload = () => {
    setTick((t) => t + 1);
    onChanged();
  };

  async function retryAllFailed() {
    if (!confirmBulk) {
      setConfirmBulk(true);
      setTimeout(() => setConfirmBulk(false), 4000);
      return;
    }
    setConfirmBulk(false);
    try {
      const r = await call<{ retried: number }>("/etims/retry-failed", {
        method: "POST",
      });
      toast.success(
        `${r.retried} invoice${r.retried === 1 ? "" : "s"} queued again`,
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not retry");
    }
  }

  const { items, meta } = data;

  return (
    <div className="grid gap-4">
      <div role="search" className="flex flex-wrap items-center gap-3">
        <InputGroup className="h-11 max-w-sm min-w-60 flex-1 bg-card">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Receipt no., KRA invoice no., signature, PIN…"
            aria-label="Search invoices"
            autoComplete="off"
          />
        </InputGroup>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-11 w-48 bg-card"
            aria-label="Filter by status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-11 w-40 bg-card"
            aria-label="Filter by type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sales and credit notes</SelectItem>
            <SelectItem value="SALE">Sales</SelectItem>
            <SelectItem value="CREDIT_NOTE">Credit notes</SelectItem>
          </SelectContent>
        </Select>

        <DateRangePicker
          from={from}
          to={to}
          onChange={({ from, to }) => {
            setFrom(from);
            setTo(to);
            setPage(1);
          }}
        />
        {summary.counts.failed > 0 && (
          <Button
            type="button"
            variant={confirmBulk ? "destructive" : "outline"}
            className="h-11"
            onClick={() => void retryAllFailed()}
          >
            {confirmBulk
              ? `Tap again to retry ${summary.counts.failed}`
              : `Retry all that could not be sent (${summary.counts.failed})`}
          </Button>
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
          <caption className="sr-only">Tax invoices</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">KRA no.</TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Tries
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                Last problem
              </TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-16 text-center text-muted-foreground"
                >
                  No invoices match.
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.internalNo}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.type === "CREDIT_NOTE" ? "Credit note" : "Sale"} ·{" "}
                      {r.cashier}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <EtimsBadge status={r.display} />
                    {RAW[r.status] && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {RAW[r.status]}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">
                    {r.invoiceNo ?? "-"}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {r.attempts}
                  </TableCell>
                  <TableCell
                    className="hidden max-w-64 truncate text-sm text-muted-foreground lg:table-cell"
                    title={r.lastErrorMessage ?? undefined}
                  >
                    {r.lastErrorMessage ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => setOpen(r.id)}
                      aria-label={`Details for ${r.internalNo}`}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pager
        meta={meta}
        count={items.length}
        loading={loading}
        onPage={setPage}
      />

      <InvoiceDialog
        invoiceId={open}
        isAdmin={isAdmin}
        onClose={() => setOpen(null)}
        onChanged={reload}
      />
    </div>
  );
}
