"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Download,
  Loader2,
  ScanBarcode,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pager } from "@/components/ui/pager";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounced } from "@/hooks/use-debounced";
import { formatDateTime } from "@/lib/dashboard/format";
import { downloadText } from "@/lib/csv";
import type {
  CountLine,
  CountSummary,
  FindResult,
  FoundProduct,
  LinesPage,
} from "@/lib/stock-count/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const ksh = (v: string) =>
  `KSh ${Number(v).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Diff({ d }: { d: number | null }) {
  if (d === null) return <span className="text-muted-foreground">-</span>;
  if (d === 0)
    return <span className="font-medium text-teal-700">Matches</span>;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        d < 0 ? "text-red-700" : "text-amber-700",
      )}
    >
      {d > 0 ? `+${d} over` : `${-d} short`}
    </span>
  );
}

type Tab = "counted" | "differences" | "uncounted";
type Message = { tone: "ok" | "err"; text: string };

export function CountSheet({
  initial,
  initialLines,
  isAdmin,
}: {
  initial: CountSummary;
  initialLines: LinesPage;
  isAdmin: boolean;
}) {
  const call = useApi();
  const router = useRouter();
  const [sum, setSum] = useState(initial);
  const [lines, setLines] = useState(initialLines);
  const [tab, setTab] = useState<Tab>("counted");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<FoundProduct[]>([]);
  const [picked, setPicked] = useState<FoundProduct | null>(null);
  const [qty, setQty] = useState("");
  const [msg, setMsg] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [review, setReview] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const dsearch = useDebounced(search, 250);
  const qRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  const open = sum.status === "OPEN";
  const t = sum.totals;

  const afterChange = useCallback(async () => {
    setTick((n) => n + 1);
    try {
      setSum(await call<CountSummary>(`/stock-counts/${sum.id}`));
    } catch {
      /* keep the last numbers */
    }
  }, [call, sum.id]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let off = false;
    setLoading(true);
    const qs = new URLSearchParams({
      filter: tab,
      page: String(page),
      limit: "9",
    });
    if (dsearch.trim()) qs.set("search", dsearch.trim());
    call<LinesPage>(`/stock-counts/${sum.id}/lines?${qs}`)
      .then((r) => !off && setLines(r))
      .catch(
        (e) =>
          !off &&
          setMsg({
            tone: "err",
            text: e instanceof Error ? e.message : "Could not load the list",
          }),
      )
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [call, sum.id, tab, page, dsearch, tick]);

  async function save(p: { id: string; name: string }, n: number) {
    setBusy(true);
    try {
      await call(`/stock-counts/${sum.id}/entries`, {
        method: "POST",
        body: JSON.stringify({ entries: [{ productId: p.id, countedQty: n }] }),
      });
      setMsg({ tone: "ok", text: `${p.name}: ${n}` });
      setPicked(null);
      setMatches([]);
      setQty("");
      setQ("");
      void afterChange();
    } catch (e) {
      setMsg({
        tone: "err",
        text: e instanceof Error ? e.message : "Could not save",
      });
    } finally {
      setBusy(false);
      qRef.current?.focus();
    }
  }

  function choose(p: FoundProduct, scanned: boolean) {
    setMatches([]);
    if (scanMode && scanned) {
      void save(p, (p.counted ?? 0) + 1); // every scan adds one
      return;
    }
    setPicked(p);
    setQty(p.counted !== null ? String(p.counted) : "");
    setTimeout(() => qtyRef.current?.select(), 0);
  }

  async function lookup(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term || busy) return;
    setMsg(null);
    try {
      const r = await call<FindResult>(
        `/stock-counts/${sum.id}/find?q=${encodeURIComponent(term)}`,
      );
      if (r.items.length === 0) {
        setMsg({
          tone: "err",
          text: r.outOfScope
            ? "That product is not in this count's category."
            : "No product found.",
        });
        setQ("");
      } else if (r.exact || r.items.length === 1) choose(r.items[0], r.exact);
      else setMatches(r.items);
    } catch (err) {
      setMsg({
        tone: "err",
        text: err instanceof Error ? err.message : "Search failed",
      });
    }
  }

  async function removeLine(l: CountLine) {
    try {
      await call(`/stock-counts/${sum.id}/entries/${l.productId}`, {
        method: "DELETE",
      });
      void afterChange();
    } catch (e) {
      setMsg({
        tone: "err",
        text: e instanceof Error ? e.message : "Could not remove",
      });
    }
  }

  async function cancelCount() {
    if (!cancelArmed) {
      setCancelArmed(true);
      setTimeout(() => setCancelArmed(false), 4000);
      return;
    }
    try {
      await call(`/stock-counts/${sum.id}/cancel`, { method: "POST" });
      toast.success("Count cancelled. No stock was changed.");
      router.push("/stock-count");
      router.refresh();
    } catch (e) {
      setMsg({
        tone: "err",
        text: e instanceof Error ? e.message : "Could not cancel",
      });
    }
  }

  const status =
    sum.status === "OPEN"
      ? "In progress"
      : sum.status === "APPLIED"
        ? "Applied"
        : "Cancelled";

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <PageHeader
        title={`Count #${sum.number}: ${sum.name}`}
        description={`${sum.categoryName ?? "Whole shop"} · ${status} · started ${formatDateTime(sum.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={async () =>
                downloadText(
                  `stock-count-${sum.number}.csv`,
                  await call<string>(`/stock-counts/${sum.id}/export`),
                )
              }
            >
              <Download aria-hidden /> Download
            </Button>
            {open && (
              <>
                <Button
                  type="button"
                  variant={cancelArmed ? "destructive" : "outline"}
                  className="h-11"
                  onClick={() => void cancelCount()}
                >
                  {cancelArmed ? "Tap again to cancel" : "Cancel count"}
                </Button>
                <Button
                  type="button"
                  className="h-11"
                  disabled={t.counted === 0}
                  onClick={() => setReview(true)}
                >
                  Review and apply
                </Button>
              </>
            )}
          </div>
        }
      />

      <section
        aria-label="Count summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-5"
      >
        {(
          [
            ["Counted", `${t.counted} of ${t.products}`, ""],
            ["Matching", String(t.matched), "text-teal-700"],
            [
              "Short",
              `${t.shortUnits} units`,
              t.shortUnits ? "text-red-700" : "",
            ],
            [
              "Over",
              `${t.overUnits} units`,
              t.overUnits ? "text-amber-700" : "",
            ],
            [
              "Net at cost",
              ksh(t.netValue),
              Number(t.netValue) < 0 ? "text-red-700" : "",
            ],
          ] as const
        ).map(([label, value, tone]) => (
          <div
            key={label}
            className="rounded-lg border border-secondary/20 bg-card p-3"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-lg font-semibold tabular-nums", tone)}>
              {value}
            </p>
          </div>
        ))}
      </section>

      {open && (
        <section
          aria-label="Enter counts"
          className="grid gap-3 rounded-xl border border-secondary/20 bg-card p-4 shadow-sm"
        >
          <form onSubmit={lookup} className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-60 flex-1">
              <ScanBarcode
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={qRef}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-12 pl-11 text-base"
                placeholder="Scan a barcode, or type a name or SKU, then press Enter"
                aria-label="Scan or search for a product"
                autoComplete="off"
                disabled={busy}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="scan-mode"
                checked={scanMode}
                onCheckedChange={setScanMode}
              />
              <Label htmlFor="scan-mode">Each scan adds 1</Label>
            </div>
          </form>

          {matches.length > 0 && (
            <ul
              className="grid gap-1 rounded-lg border border-secondary/20 p-1"
              aria-label="Matching products"
            >
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => choose(m, false)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.sku}
                      {m.counted !== null && ` · counted ${m.counted}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picked && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (/^\d{1,7}$/.test(qty)) void save(picked, Number(qty));
              }}
              className="flex flex-wrap items-end gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
            >
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{picked.name}</p>
                <p className="text-xs text-muted-foreground">
                  {picked.sku}
                  {picked.counted !== null &&
                    ` · already counted ${picked.counted}. Typing a number replaces it.`}
                </p>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="counted-qty">How many are on the shelf?</Label>
                <Input
                  ref={qtyRef}
                  id="counted-qty"
                  inputMode="numeric"
                  className="h-12 w-40 text-lg tabular-nums"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                className="h-12"
                disabled={busy || qty === ""}
              >
                {busy && <Loader2 className="animate-spin" aria-hidden />} Save
                count
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12"
                onClick={() => {
                  setPicked(null);
                  qRef.current?.focus();
                }}
              >
                Not this one
              </Button>
            </form>
          )}

          <p
            role="status"
            aria-live="polite"
            className={cn(
              "min-h-5 text-sm",
              msg?.tone === "err"
                ? "font-medium text-red-700"
                : "text-teal-700",
            )}
          >
            {msg?.text}
          </p>
        </section>
      )}

      {!open && msg && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as Tab);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="counted">Counted ({t.counted})</TabsTrigger>
            <TabsTrigger value="differences">
              Differences ({t.shortLines + t.overLines})
            </TabsTrigger>
            <TabsTrigger value="uncounted">
              Not counted ({t.uncounted})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-4">
          <Input
            aria-label="Filter the list"
            placeholder="Filter by name, SKU or barcode…"
            className="h-10 w-64 bg-card"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <Switch
              id="show-system"
              checked={showSystem}
              onCheckedChange={setShowSystem}
            />
            <Label htmlFor="show-system">Show system quantity</Label>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border border-secondary/20 bg-card shadow-sm transition-opacity",
          loading && "opacity-60",
        )}
        aria-busy={loading}
      >
        <Table>
          <caption className="sr-only">Products in this count</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              {(showSystem || !open) && (
                <TableHead className="text-right">System</TableHead>
              )}
              <TableHead className="text-right">Counted</TableHead>
              {(showSystem || !open) && <TableHead>Difference</TableHead>}
              <TableHead className="w-12">
                <span className="sr-only">Remove</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-14 text-center text-muted-foreground"
                >
                  {tab === "uncounted"
                    ? "Everything in scope has been counted."
                    : "Nothing here yet."}
                </TableCell>
              </TableRow>
            ) : (
              lines.items.map((l) => (
                <TableRow key={l.productId}>
                  <TableCell>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.sku}
                      {l.barcode && ` · ${l.barcode}`}
                    </div>
                  </TableCell>
                  {(showSystem || !open) && (
                    <TableCell className="text-right tabular-nums">
                      {l.systemQty}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {open ? (
                      <Input
                        key={`${l.productId}-${l.countedQty ?? "x"}`}
                        aria-label={`Counted quantity for ${l.name}`}
                        inputMode="numeric"
                        className="ml-auto h-10 w-24 text-right tabular-nums"
                        defaultValue={l.countedQty ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (/^\d{1,7}$/.test(v) && Number(v) !== l.countedQty)
                            void save(
                              { id: l.productId, name: l.name },
                              Number(v),
                            );
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.currentTarget.blur()
                        }
                      />
                    ) : (
                      <span className="tabular-nums">
                        {l.countedQty ?? "-"}
                      </span>
                    )}
                  </TableCell>
                  {(showSystem || !open) && (
                    <TableCell>
                      <Diff d={l.difference} />
                      {l.valueDiff && l.difference ? (
                        <div className="text-xs text-muted-foreground">
                          {ksh(l.valueDiff)}
                        </div>
                      ) : null}
                    </TableCell>
                  )}
                  <TableCell>
                    {open && l.countedQty !== null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        onClick={() => void removeLine(l)}
                        aria-label={`Remove the count for ${l.name}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pager
        meta={lines.meta}
        count={lines.items.length}
        loading={loading}
        onPage={setPage}
      />

      <ReviewDialog
        open={review}
        onClose={() => setReview(false)}
        sum={sum}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function ReviewDialog({
  open,
  onClose,
  sum,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  sum: CountSummary;
  isAdmin: boolean;
}) {
  const call = useApi();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = sum.totals;
  const blocked = sum.needsApproval && !isAdmin;

  async function apply() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ adjusted: number }>(
        `/stock-counts/${sum.id}/apply`,
        {
          method: "POST",
          body: JSON.stringify({ note: note.trim() || undefined }),
        },
      );
      toast.success(
        `Stock updated: ${r.adjusted} ${r.adjusted === 1 ? "product" : "products"} adjusted`,
      );
      router.push("/stock-count");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply the count");
      setArmed(false);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply count #{sum.number}?</DialogTitle>
          <DialogDescription>
            This changes your stock levels. Each difference is recorded as an
            adjustment you can trace.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Products counted</dt>
            <dd className="font-semibold">{t.counted}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Will be adjusted</dt>
            <dd className="font-semibold">{t.shortLines + t.overLines}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Short</dt>
            <dd className="font-semibold text-red-700">
              {t.shortUnits} units · {ksh(t.shortValue)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Over</dt>
            <dd className="font-semibold text-amber-700">
              {t.overUnits} units · {ksh(t.overValue)}
            </dd>
          </div>
        </dl>
        {t.uncounted > 0 && (
          <Alert>
            <AlertDescription className="text-foreground">
              <strong>{t.uncounted}</strong> products in this count were not
              counted. They stay exactly as they are. Check the &quot;Not
              counted&quot; tab first if that is not what you want.
            </AlertDescription>
          </Alert>
        )}
        {blocked && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>
              The difference is above KSh {sum.approvalValue.toLocaleString()}{" "}
              at cost, so an administrator must apply this count. You can leave
              it open for them.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-1">
          <Label htmlFor="apply-note">Note (optional)</Label>
          <Input
            id="apply-note"
            className="h-11"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Month-end count, aisle 3"
            maxLength={150}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onClose}
            disabled={busy}
          >
            Keep counting
          </Button>
          <Button
            type="button"
            className="h-11"
            variant={armed ? "destructive" : "default"}
            disabled={busy || blocked}
            onClick={() => void apply()}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {armed ? "Tap again to apply" : "Apply adjustments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
