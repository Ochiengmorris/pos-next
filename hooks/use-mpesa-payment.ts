"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/use-api";

type StkStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";
type StkResponse = {
  id: string;
  status: StkStatus;
  receipt: string | null;
  message: string | null;
};

export type MpesaState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "waiting"; id: string; phone: string; amountCents: number }
  | {
      phase: "failed";
      reason: "CANCELLED" | "TIMEOUT" | "FAILED" | "ERROR";
      message: string;
    }
  | { phase: "paid"; id: string; receipt: string | null; amountCents: number };

const POLL_MS = 3000;

function toState(
  r: StkResponse,
  phone: string,
  amountCents: number,
): MpesaState {
  switch (r.status) {
    case "PENDING":
      return { phase: "waiting", id: r.id, phone, amountCents };
    case "SUCCESS":
      return { phase: "paid", id: r.id, receipt: r.receipt, amountCents };
    case "CANCELLED":
      return {
        phase: "failed",
        reason: "CANCELLED",
        message: "The customer cancelled the request.",
      };
    case "TIMEOUT":
      return {
        phase: "failed",
        reason: "TIMEOUT",
        message: "The customer didn't respond in time.",
      };
    default:
      return {
        phase: "failed",
        reason: "FAILED",
        message: r.message || "The payment did not go through.",
      };
  }
}

export function useMpesaPayment() {
  const call = useApi();
  const [state, setState] = useState<MpesaState>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);

  const reset = useCallback(() => {
    setState({ phase: "idle" });
    setElapsed(0);
  }, []);

  const start = useCallback(
    async (phone: string, amountCents: number) => {
      setState({ phase: "sending" });
      setElapsed(0);
      try {
        const res = await call<StkResponse>("/payments/mpesa/stk", {
          method: "POST",
          body: JSON.stringify({ phone, amount: amountCents / 100 }),
        });
        setState(toState(res, phone, amountCents));
      } catch (e) {
        setState({
          phase: "failed",
          reason: "ERROR",
          message:
            e instanceof Error
              ? e.message
              : "Could not send the M-Pesa request",
        });
      }
    },
    [call],
  );

  const waitingId = state.phase === "waiting" ? state.id : null;

  const checkNow = useCallback(async () => {
    if (!waitingId) return;
    try {
      const r = await call<StkResponse>(`/payments/mpesa/${waitingId}`);
      // ignore the answer if the cashier has moved on in the meantime
      setState((cur) =>
        cur.phase === "waiting" && cur.id === r.id
          ? toState(r, cur.phone, cur.amountCents)
          : cur,
      );
    } catch {
      // a network blip is fine: the next tick tries again
    }
  }, [call, waitingId]);

  useEffect(() => {
    if (!waitingId) return;
    const poll = setInterval(() => void checkNow(), POLL_MS);
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [waitingId, checkNow]);

  return { state, elapsed, start, reset, checkNow };
}

export type MpesaController = ReturnType<typeof useMpesaPayment>;
