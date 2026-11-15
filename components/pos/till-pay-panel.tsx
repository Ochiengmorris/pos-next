"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Loader2, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ksh } from "@/lib/cash/format";
import type { TillPaymentView, TillWaiting } from "@/lib/till/types";
import { useApi } from "@/lib/use-api";

const POLL_MS = 3000;
const GIVE_UP_MS = 10 * 60 * 1000;

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", rest: parts.slice(1).join(" ") };
}

function Code({ id, mask }: { id: string; mask: boolean }) {
  return (
    <span className="font-mono tracking-wide">
      <span className="text-muted-foreground">{id.slice(0, -4)}</span>
      {!mask ? (
        <span className="text-muted-foreground">••••</span>
      ) : (
        <span className="font-bold text-foreground">{id.slice(-4)}</span>
      )}
    </span>
  );
}

/**
 * "The customer pays the till themselves." Shows the till number and amount, watches for the
 * payment to arrive, and hands the chosen M-Pesa code back to the sale screen.
 *
 * onPicked({ transId, amount }) -> add a payment { method: "MPESA", amount, reference: transId, source: "TILL" }
 * to the sale. The server re-checks everything when the sale is saved.
 */
export function TillPayPanel({
  amount,
  onPicked,
  // onCancel,
}: {
  amount: string; // the sale total, e.g. "390.00"
  onPicked: (p: { transId: string; amount: string }) => void;
  onCancel: () => void;
}) {
  const call = useApi();
  const [data, setData] = useState<TillWaiting | null>(null);
  const [code, setCode] = useState("");
  const [typed4, setTyped4] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCode, setShowCode] = useState(false);

  // Give up waiting after 10 minutes
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, []);

  // Poll for the payment until it arrives, the user leaves, or we time out
  useEffect(() => {
    if (timedOut) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const loop = async () => {
      try {
        const q = new URLSearchParams({ amount });
        if (code.trim().length >= 3) q.set("code", code.trim());
        const res = await call<TillWaiting>(
          `/till-payments/waiting?${q.toString()}`,
        );
        if (!cancelled) setData(res);
      } catch {
        /* a missed poll is fine; the next one will try again */
      }
      if (!cancelled) timer = setTimeout(loop, POLL_MS);
    };

    void loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [call, amount, code, timedOut, refreshKey]);

  async function use(p: TillPaymentView) {
    setBusy(p.transId);
    setError(null);
    try {
      await call(`/till-payments/${p.transId}/reserve`, {
        method: "POST",
        body: JSON.stringify({ codeLast4: typed4 || undefined }),
      });
      onPicked({ transId: p.transId, amount: p.amount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use that payment");
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(null);
      setShowCode(false);
    }
  }

  const matches = data?.matches ?? [];
  const others = data?.others ?? [];

  if (data && !data.enabled) {
    return (
      <Alert>
        <AlertDescription>
          Customer-pays-the-till is not switched on yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-3 min-w-0">
      {/* Till info + amount + live status in one card */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-teal-900">
            <Smartphone className="size-4" aria-hidden /> Customer pays at the
            till
          </p>
          <p className="text-2xl font-bold tabular-nums text-teal-950">
            {ksh(amount)}
          </p>
        </div>

        {matches.length === 0 && !timedOut && (
          <p
            role="status"
            className="mt-2 flex items-center gap-2 border-t border-teal-200 pt-2 text-sm text-teal-900"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden /> Waiting for
            the payment…
          </p>
        )}
      </div>

      {timedOut && matches.length === 0 && (
        <Alert>
          <AlertDescription>
            Nothing has arrived after 10 minutes. Check the till number and
            amount with the customer, or look for their M-Pesa code below.
          </AlertDescription>
        </Alert>
      )}

      {matches.length > 0 && (
        <section
          className="grid gap-2 min-w-0"
          aria-label="Payments that match this sale"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {matches.length === 1
              ? "Payment received"
              : `${matches.length} payments received`}
            {" · "}confirm the name with the customer
          </p>

          {data?.requireCodeEntry && (
            <label className="flex items-center gap-3 text-sm">
              <span className="font-medium">
                Last 4 of the code in the customer&apos;s SMS
              </span>
              <Input
                value={typed4}
                onChange={(e) => setTyped4(e.target.value.toUpperCase())}
                maxLength={4}
                autoComplete="off"
                className="h-11 w-24 text-center font-mono text-lg uppercase"
              />
            </label>
          )}

          <ul className="grid gap-2 min-w-0">
            {matches.map((p) => {
              const { first, rest } = splitName(p.payerName);
              return (
                <li
                  key={p.transId}
                  className="flex items-center min-w-0 gap-3 rounded-xl border border-teal-200 bg-card p-3 shadow-sm"
                >
                  <CircleCheck
                    className="size-5 shrink-0 text-teal-700"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="flex min-w-0 items-baseline gap-1.5 text-base font-semibold leading-tight"
                      title={p.payerName ?? undefined}
                    >
                      {first ? (
                        <>
                          <span className="max-w-[65%] shrink-0 truncate">
                            {first}
                          </span>
                          {rest && (
                            <span className="min-w-0 flex-1 truncate">
                              {rest}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-normal italic text-muted-foreground">
                          Name not shown
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      <Code id={p.transId} mask={!!data?.requireCodeEntry} />
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">{clock(p.time)}</span>
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">{ksh(p.amount)}</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-11 shrink-0"
                    disabled={
                      busy !== null ||
                      (!!data?.requireCodeEntry && typed4.length < 4)
                    }
                    onClick={() => void use(p)}
                  >
                    {busy === p.transId ? "Checking…" : "Use payment"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Manual code lookup: always available, collapsed once matches exist */}
      {showCode || code || matches.length === 0 ? (
        <label className="grid max-w-xs gap-1 text-sm">
          <span className="font-medium">
            Customer already paid? Type the end of their M-Pesa code
          </span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onFocus={() => setShowCode(true)}
            placeholder="e.g. XYZ123"
            maxLength={12}
            autoComplete="off"
            className="h-11 font-mono uppercase"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowCode(true)}
          className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Not the right payment? Search by M-Pesa code
        </button>
      )}

      {others.length > 0 && matches.length === 0 && (
        <Alert>
          <AlertDescription>
            Other payments arrived that do not match KSh {amount}:{" "}
            {others
              .map((o) => `${ksh(o.amount)} at ${clock(o.time)}`)
              .join(", ")}
            . If one of these is your customer, the amount is wrong. Ask a
            manager to sort out the difference.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
