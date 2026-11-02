"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { formatDateTime } from "@/lib/dashboard/format";
import type { CountListItem, CountStatus } from "@/lib/stock-count/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const STATUS: Record<CountStatus, { label: string; tone: string }> = {
  OPEN: { label: "In progress", tone: "bg-amber-100 text-amber-900" },
  APPLIED: { label: "Applied", tone: "bg-teal-100 text-teal-900" },
  CANCELLED: { label: "Cancelled", tone: "bg-muted text-muted-foreground" },
};

export function CountsList({ initial }: { initial: CountListItem[] }) {
  const open = initial.find((c) => c.status === "OPEN");
  const [dialog, setDialog] = useState(false);

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Stock count"
        description="Count what is on the shelves and correct the system in one go."
        actions={
          !open && (
            <Button
              type="button"
              className="h-11"
              onClick={() => setDialog(true)}
            >
              <Plus aria-hidden /> Start a count
            </Button>
          )
        }
      />

      {open && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-foreground">
            <span>
              Count #{open.number} ({open.name}) is in progress, with{" "}
              {open.lines} products counted so far.
            </span>
            <Link
              href={`/stock-count/${open.id}`}
              className={buttonVariants({ className: "h-10" })}
            >
              Continue counting
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-secondary/20 bg-card shadow-sm">
        <Table>
          <caption className="sr-only">Stock counts</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Started</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead>
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-16 text-center text-muted-foreground"
                >
                  No counts yet.
                </TableCell>
              </TableRow>
            ) : (
              initial.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular-nums">{c.number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.categoryName ?? "Whole shop"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        STATUS[c.status].tone,
                      )}
                    >
                      {STATUS[c.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDateTime(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.lines}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/stock-count/${c.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        className: "h-10",
                      })}
                    >
                      {c.status === "OPEN" ? "Continue" : "View"}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StartDialog open={dialog} onClose={() => setDialog(false)} />
    </div>
  );
}

function StartDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const call = useApi();
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [scope, setScope] = useState("all");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    call<unknown>("/categories")
      .then((r) =>
        setCats(
          (Array.isArray(r)
            ? r
            : ((r as { items?: unknown[] }).items ?? [])) as {
            id: string;
            name: string;
          }[],
        ),
      )
      .catch(() => setCats([]));
  }, [open, call]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const c = await call<{ id: string }>("/stock-counts", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || undefined,
          categoryId: scope === "all" ? undefined : scope,
        }),
      });
      router.push(`/stock-count/${c.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the count");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a stock count</DialogTitle>
          <DialogDescription>
            Counting a single category (an aisle) at a time is easier than the
            whole shop.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel>What are you counting?</FieldLabel>
          <Select value={scope} onValueChange={(v) => setScope(v ?? "all")}>
            <SelectTrigger className="h-11" aria-label="Count scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Whole shop</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="count-name">Name (optional)</FieldLabel>
          <Input
            id="count-name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Month-end beverages"
            autoComplete="off"
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11"
            onClick={() => void start()}
            disabled={busy}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />} Start
            counting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
