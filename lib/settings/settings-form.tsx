// components/settings/settings-form.tsx
"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { ReceiptBody } from "@/components/pos/receipt-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Receipt } from "@/lib/pos/types";
// import type { StoreSettings } from "@/lib/settings/types";
import { useApi } from "@/lib/use-api";
import { StoreSettings } from "./types";

const pick = (s: StoreSettings): StoreSettings => ({
  name: s.name,
  address: s.address,
  phone: s.phone,
  taxPin: s.taxPin,
  receiptFooter: s.receiptFooter,
});

export function SettingsForm({ initial }: { initial: StoreSettings }) {
  const call = useApi();
  const [saved, setSaved] = useState(pick(initial));
  const [v, setV] = useState(pick(initial));
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof StoreSettings) => (value: string) =>
    setV((cur) => ({ ...cur, [field]: value }));
  const dirty = (Object.keys(saved) as (keyof StoreSettings)[]).some(
    (k) => v[k].trim() !== saved[k],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (v.name.trim().length < 2) {
      setNameError("Enter your shop's name");
      return;
    }
    setNameError(null);
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await call<StoreSettings>("/settings/store", {
        method: "PATCH",
        body: JSON.stringify(v),
      });
      const next = pick(res);
      setSaved(next);
      setV(next);
      toast.success("Settings saved. New receipts will use them.");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not save the settings",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // sample sale, with the shop details you are typing, using the real receipt layout
  const sample: Receipt = {
    status: "COMPLETED",
    store: {
      name: v.name.trim() || "Your shop name",
      address: v.address.trim(),
      phone: v.phone.trim(),
      taxPin: v.taxPin.trim(),
      footer: v.receiptFooter.trim(),
    },
    receiptNo: "RCP-000123",
    date: "2026-10-14T09:30:00+03:00",
    cashier: "Chris Cashier",
    customer: null,
    items: [
      { name: "Soda 500ml", quantity: 2, unitPrice: "70", lineTotal: "140" },
      { name: "Bread 400g", quantity: 1, unitPrice: "65", lineTotal: "65" },
    ],
    subtotal: "185.69",
    taxTotal: "19.31",
    total: "205",
    payments: [
      { method: "CASH", amount: "205", reference: null, tendered: "500" },
    ],
    changeDue: "295",
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Settings"
        description="Your shop's details, printed on every receipt."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Shop details</CardTitle>
            <CardDescription>
              Changes apply to every receipt from now on, including reprints of
              older sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate>
              <FieldGroup>
                {serverError && (
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden />
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                <Field data-invalid={!!nameError}>
                  <FieldLabel htmlFor="s-name">Shop name</FieldLabel>
                  <Input
                    id="s-name"
                    maxLength={80}
                    autoComplete="off"
                    className="h-11"
                    value={v.name}
                    onChange={(e) => set("name")(e.target.value)}
                    aria-invalid={!!nameError}
                  />
                  {nameError && <FieldError>{nameError}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="s-address">Address</FieldLabel>
                  <Input
                    id="s-address"
                    maxLength={200}
                    autoComplete="off"
                    className="h-11"
                    value={v.address}
                    onChange={(e) => set("address")(e.target.value)}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="s-phone">Phone</FieldLabel>
                    <Input
                      id="s-phone"
                      type="tel"
                      maxLength={30}
                      autoComplete="off"
                      className="h-11"
                      value={v.phone}
                      onChange={(e) => set("phone")(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="s-pin">Tax PIN (KRA)</FieldLabel>
                    <Input
                      id="s-pin"
                      maxLength={30}
                      autoComplete="off"
                      spellCheck={false}
                      className="h-11 font-mono"
                      value={v.taxPin}
                      onChange={(e) =>
                        set("taxPin")(e.target.value.toUpperCase())
                      }
                    />
                    <FieldDescription>
                      Printed on receipts. Leave blank to hide it.
                    </FieldDescription>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="s-footer">Closing line</FieldLabel>
                  <Input
                    id="s-footer"
                    maxLength={120}
                    autoComplete="off"
                    className="h-11"
                    value={v.receiptFooter}
                    onChange={(e) => set("receiptFooter")(e.target.value)}
                  />
                  <FieldDescription>
                    The last line on the receipt. Leave blank for none.
                  </FieldDescription>
                </Field>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {dirty && !submitting && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11"
                      onClick={() => {
                        setV(saved);
                        setNameError(null);
                      }}
                    >
                      Discard changes
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="h-11 min-w-32"
                    disabled={!dirty || submitting}
                    aria-busy={submitting}
                  >
                    {submitting && (
                      <Loader2 className="animate-spin" aria-hidden />
                    )}
                    {submitting ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Receipt preview</CardTitle>
            <CardDescription>
              Updates as you type. The items are samples.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border bg-white p-4"
              aria-label="Receipt preview"
            >
              <ReceiptBody r={sample} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
