// components/etims/etims-manager.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, Clock, FileWarning, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/dashboard/format";
import type { EtimsSummary, InvoicesPage } from "@/lib/etims/types";
import { useApi } from "@/lib/use-api";
import { TaxReviewPanel } from "./tax-review-panel";
import { KpiCard } from "../dashboard/kpi-cards";
import { InvoicesPanel } from "./invoice-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Tab = "invoices" | "vat";
export type MockMode =
  | "ok"
  | "down"
  | "timeout"
  | "reject"
  | "flaky"
  | "lost_response"
  | "lost_response_strict";

const MODE_LABELS: Record<MockMode, string> = {
  ok: "Works normally",
  down: "KRA is down",
  timeout: "Request times out",
  reject: "KRA rejects invoices",
  flaky: "Fails now and then",
  lost_response: "Reply lost (KRA has it)",
  lost_response_strict: "Reply lost (duplicate refused)",
};
const IS_DEV = process.env.NODE_ENV === "development";

export function EtimsManager({
  initialSummary,
  initialInvoices,
  isAdmin,
}: {
  initialSummary: EtimsSummary;
  initialInvoices: InvoicesPage;
  isAdmin: boolean;
}) {
  const call = useApi();
  const [summary, setSummary] = useState(initialSummary);
  const [tab, setTab] = useState<Tab>("invoices");
  const [mock, setMock] = useState<{
    mode: MockMode;
    modes: MockMode[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!IS_DEV) return;
    let cancelled = false;
    call<{ mode: MockMode; modes: MockMode[] }>("/etims/dev/mock-mode")
      .then((m) => {
        if (!cancelled) setMock(m);
      })
      .catch(() => {
        /* not available: control stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [call]);

  async function changeMode(mode: MockMode) {
    if (!mock) return;
    const previous = mock;
    setMock({ ...mock, mode }); // optimistic
    setSaving(true);
    try {
      await call("/etims/dev/mock-mode", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      toast.success(`Mock KRA: ${MODE_LABELS[mode]}`);
    } catch (e) {
      setMock(previous); // revert
      toast.error(
        e instanceof Error ? e.message : "Could not change the mock mode",
      );
    } finally {
      setSaving(false);
    }
  }
  const refresh = useCallback(async () => {
    try {
      setSummary(await call<EtimsSummary>("/etims/summary"));
    } catch {
      /* keep the last numbers */
    }
  }, [call]);

  const s = summary;
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="eTIMS"
        description="Tax invoices sent to KRA: what's filed, what's waiting, and what needs a person."
      />
      <div className="flex gap-3">
        {s.provider === "disabled" && (
          <Alert variant="destructive">
            <AlertDescription>
              eTIMS is switched off. Sales are not being submitted to KRA.
            </AlertDescription>
          </Alert>
        )}
        {s.mock && (
          <Alert>
            <AlertDescription className="text-foreground">
              Development mode: invoices are sent to a <strong>mock</strong>{" "}
              KRA. Nothing here has been filed with KRA, and none of it is a
              real tax invoice.
            </AlertDescription>
          </Alert>
        )}
        {s.provider !== "disabled" && !s.workerOn && (
          <Alert variant="destructive">
            <AlertDescription>
              The background sender is switched off, so no invoice will be
              submitted until it is turned back on.
            </AlertDescription>
          </Alert>
        )}
        {IS_DEV && s.mock && isAdmin && mock && (
          <div className="flex shrink-0 items-center border rounded-sm px-3 w-fit gap-3">
            <Label
              htmlFor="mock-mode"
              className="text-sm text-muted-foreground"
            >
              Mock KRA behaviour
            </Label>
            <Select
              value={mock.mode}
              onValueChange={(v) => void changeMode(v as MockMode)}
              disabled={saving}
            >
              <SelectTrigger id="mock-mode" className="h-11 min-w-fit bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mock.modes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABELS[m] ?? m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <section
        aria-label="eTIMS summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Pending"
          value={String(s.counts.pending)}
          icon={Clock}
          tone="blue"
        >
          <span>
            {s.oldestPendingAt
              ? `Oldest waiting since ${formatDateTime(s.oldestPendingAt)}`
              : "Nothing waiting"}
          </span>
        </KpiCard>
        <KpiCard
          label="Filed"
          value={String(s.counts.accepted)}
          icon={CircleCheck}
          tone="teal"
        >
          <span>
            {s.lastAcceptedAt
              ? `Last one ${formatDateTime(s.lastAcceptedAt)}`
              : "None yet"}
          </span>
        </KpiCard>
        <KpiCard
          label="Needs attention"
          value={String(s.needsAttention)}
          icon={FileWarning}
          tone="red"
        >
          <span>
            {s.counts.rejected} rejected · {s.counts.failed} not sent ·{" "}
            {s.counts.uncertain} unknown
          </span>
          {s.stuck > 0 && <span>{s.stuck} waiting too long</span>}
        </KpiCard>
        <KpiCard
          label="VAT classes to review"
          value={String(s.unreviewedProducts)}
          icon={ListChecks}
          tone="amber"
        >
          <span>
            {s.unreviewedProducts === 0
              ? "All products reviewed"
              : "Products still on a placeholder class"}
          </span>
        </KpiCard>
      </section>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className={"flex flex-col"}
      >
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="vat">
            VAT classes
            {s.unreviewedProducts > 0 ? ` (${s.unreviewedProducts})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesPanel
            initial={initialInvoices}
            summary={s}
            isAdmin={isAdmin}
            onChanged={() => void refresh()}
          />
        </TabsContent>
        <TabsContent value="vat" className="mt-4">
          <TaxReviewPanel isAdmin={isAdmin} onChanged={() => void refresh()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
