"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  addDays,
  businessToday,
  endOfDayISO,
  formatDateTime,
  startOfDayISO,
} from "@/lib/dashboard/format";
import { formatKsh, toCents } from "@/lib/pos/money";
import type { Receipt } from "@/lib/pos/types";
import type { SaleRow, SalesPage } from "@/lib/sales/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { VoidDialog, type VoidTarget } from "./void-dialog";
import { DateRangePicker } from "../app/date-range-picker";
import { EtimsBadge } from "../etims/etims-badge";

type Preset = "all" | "today" | "7d" | "custom";
const METHOD: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MPESA: "M-Pesa",
};

const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "all", label: "All time" },
];

export function TransactionsManager({
  initialData,
  canVoid,
}: {
  initialData: SalesPage;
  canVoid: boolean;
}) {
  const call = useApi();
  const [data, setData] = useState(initialData);
  const [receiptQuery, setReceiptQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [opening, setOpening] = useState<string | null>(null);
  const [open, setOpen] = useState<{ row: SaleRow; receipt: Receipt } | null>(
    null,
  );
  const [voiding, setVoiding] = useState<VoidTarget | null>(null);

  const debouncedReceipt = useDebounced(receiptQuery, 250);
  const skipFirst = useRef(true);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the server already gave us page 1
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({ page: String(page), limit: "9" });
        if (debouncedReceipt.trim()) qs.set("receipt", debouncedReceipt.trim());
        if (status !== "all") qs.set("status", status);
        if (from) qs.set("from", startOfDayISO(from));
        if (to) qs.set("to", endOfDayISO(to));
        const res = await call<SalesPage>(`/sales?${qs}`);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load sales");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, debouncedReceipt, status, from, to, page, tick]);

  function applyPreset(p: Exclude<Preset, "custom">) {
    setPreset(p);
    setPage(1);
    if (p === "all") {
      setFrom("");
      setTo("");
      return;
    }
    const today = businessToday();
    setTo(today);
    setFrom(p === "today" ? today : addDays(today, -6));
  }

  async function view(row: SaleRow) {
    setOpening(row.id);
    try {
      setOpen({
        row,
        receipt: await call<Receipt>(`/sales/${row.id}/receipt`),
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not open the receipt",
      );
    } finally {
      setOpening(null);
    }
  }

  const { items, meta } = data;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Transactions"
        description={
          canVoid ? "Every sale, newest first." : "Your sales, newest first."
        }
      />

      <div role="search" className="flex flex-wrap items-center gap-3">
        <InputGroup className="h-11 max-w-xs min-w-52 flex-1 bg-card">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={receiptQuery}
            onChange={(e) => {
              setReceiptQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Receipt number, e.g. 123"
            aria-label="Search by receipt number"
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
            className="h-11 w-40 bg-card"
            aria-label="Filter by status"
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>

        <div
          role="group"
          aria-label="Period"
          className="flex gap-1 rounded-lg border bg-card p-1"
        >
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={preset === p.id ? "default" : "ghost"}
              aria-pressed={preset === p.id}
              className="h-9"
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <DateRangePicker
          from={from}
          to={to}
          onChange={({ from, to }) => {
            setFrom(from);
            setTo(to);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {error}
            <Button type="button" size="sm" variant="outline" onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
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
          <caption className="sr-only">Sales</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Time</TableHead>
              {canVoid && (
                <TableHead className="hidden md:table-cell">Cashier</TableHead>
              )}
              <TableHead className="hidden text-right sm:table-cell">
                Items
              </TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">eTIMS</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-16 text-center text-muted-foreground"
                >
                  No sales match.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => {
                const cancelled = s.status !== "COMPLETED";
                const methods = [...new Set(s.payments.map((p) => p.method))];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.receiptNo}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    {canVoid && (
                      <TableCell className="hidden md:table-cell">
                        {s.cashier.name}
                      </TableCell>
                    )}
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {s.items.reduce((n, i) => n + i.quantity, 0)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {methods.map((m) => METHOD[m] ?? m).join(" + ")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        cancelled && "text-muted-foreground line-through",
                      )}
                    >
                      {formatKsh(toCents(s.total))}
                    </TableCell>
                    <TableCell>
                      {cancelled ? (
                        <Badge variant="destructive">
                          {s.status === "VOIDED" ? "Voided" : "Refunded"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <EtimsBadge status={s.etims} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        disabled={opening !== null}
                        onClick={() => void view(s)}
                        aria-label={`View receipt ${s.receiptNo}`}
                      >
                        {opening === s.id && (
                          <Loader2 className="animate-spin" aria-hidden />
                        )}
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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

      <ReceiptDialog
        receipt={open?.receipt ?? null}
        title="Receipt"
        closeLabel="Close"
        onClose={() => setOpen(null)}
        extraActions={
          canVoid && open?.receipt.status === "COMPLETED" ? (
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              onClick={() => {
                const row = open.row;
                setOpen(null);
                setVoiding({
                  id: row.id,
                  receiptNo: row.receiptNo,
                  methods: [...new Set(row.payments.map((p) => p.method))],
                });
              }}
            >
              Void sale
            </Button>
          ) : undefined
        }
      />

      <VoidDialog
        target={voiding}
        onClose={() => setVoiding(null)}
        onVoided={() => {
          setVoiding(null);
          reload();
        }}
      />
    </div>
  );
}
