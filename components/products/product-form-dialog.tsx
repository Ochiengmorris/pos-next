"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import type { Category } from "@/lib/pos/types";
import type { ManagedProduct } from "@/lib/products/types";
import { useApi } from "@/lib/use-api";

const NONE = "none"; // a select item can't have an empty value
const MONEY = /^\d+(\.\d{1,2})?$/;
const WHOLE = /^\d+$/;
const VAT_PRESETS = ["16", "8", "0"];

type Values = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  price: string;
  costPrice: string;
  taxRate: string;
  reorderLevel: string;
  initialStock: string;
};
type Errors = Partial<Record<keyof Values, string>>;

// Order matters: first invalid field in this list gets focus.
const FIELD_IDS: Record<keyof Values, string> = {
  name: "p-name",
  sku: "p-sku",
  barcode: "p-barcode",
  categoryId: "p-category",
  price: "p-price",
  costPrice: "p-cost",
  taxRate: "p-vat",
  reorderLevel: "p-reorder",
  initialStock: "p-stock",
};

const ksh = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function initialValues(p: ManagedProduct | null): Values {
  if (!p) {
    return {
      name: "",
      sku: "",
      barcode: "",
      categoryId: NONE,
      price: "",
      costPrice: "",
      taxRate: "16",
      reorderLevel: "5",
      initialStock: "0",
    };
  }
  return {
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? "",
    categoryId: p.categoryId ?? NONE,
    price: p.price,
    costPrice: p.costPrice,
    taxRate: p.taxRate,
    reorderLevel: String(p.reorderLevel),
    initialStock: "0",
  };
}

function validate(v: Values, isEdit: boolean): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Enter the product name";
  if (!v.sku.trim()) e.sku = "Enter a SKU (your own product code)";
  if (!MONEY.test(v.price)) e.price = "Enter a price like 70 or 70.50";
  if (v.costPrice && !MONEY.test(v.costPrice))
    e.costPrice = "Enter a cost like 50 or 50.25";
  const rate = Number(v.taxRate);
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(v.taxRate) || rate > 100)
    e.taxRate = "Enter a rate between 0 and 100";
  if (!WHOLE.test(v.reorderLevel))
    e.reorderLevel = "Enter a whole number, 0 or more";
  if (!isEdit && v.initialStock && !WHOLE.test(v.initialStock))
    e.initialStock = "Enter a whole number, 0 or more";
  return e;
}

function toPayload(v: Values, isEdit: boolean) {
  const base = {
    sku: v.sku.trim(),
    name: v.name.trim(),
    price: Number(v.price),
    costPrice: v.costPrice ? Number(v.costPrice) : 0,
    taxRate: Number(v.taxRate),
    reorderLevel: Number(v.reorderLevel),
  };
  if (isEdit) {
    // null clears the field on the server
    return {
      ...base,
      barcode: v.barcode.trim() || null,
      categoryId: v.categoryId === NONE ? null : v.categoryId,
    };
  }
  return {
    ...base,
    ...(v.barcode.trim() && { barcode: v.barcode.trim() }),
    ...(v.categoryId !== NONE && { categoryId: v.categoryId }),
    ...(Number(v.initialStock) > 0 && { initialStock: Number(v.initialStock) }),
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ManagedProduct | null; // null = add
  categories: Category[];
  onSaved: () => void;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Changes apply at the till straight away."
              : "A new product can be sold as soon as it is saved."}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          key={product?.id ?? "new"}
          product={product}
          categories={categories}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  product,
  categories,
  onCancel,
  onSaved,
}: Omit<Props, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const call = useApi();
  const isEdit = product !== null;
  const initial = useMemo(() => initialValues(product), [product]);
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const dirty = useMemo(
    () => (Object.keys(v) as (keyof Values)[]).some((k) => v[k] !== initial[k]),
    [v, initial],
  );

  // Base UI's Select shows the raw value unless it is given value -> label pairs.
  const categoryItems = useMemo(
    () => [
      { value: NONE, label: "No category" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const set = (field: keyof Values) => (value: string) => {
    setV((cur) => ({ ...cur, [field]: value }));
    setErrors((cur) => (cur[field] ? { ...cur, [field]: undefined } : cur));
  };
  const text = (field: keyof Values) => ({
    value: v[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(field)(e.target.value),
    "aria-invalid": !!errors[field],
  });
  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    e.target.select();

  // Price breakdown: only when the numbers are valid
  const breakdown = useMemo(() => {
    if (!MONEY.test(v.price)) return null;
    const price = Number(v.price);
    const rate = /^\d{1,3}(\.\d{1,2})?$/.test(v.taxRate)
      ? Number(v.taxRate)
      : null;
    const vat = rate !== null ? price - price / (1 + rate / 100) : null;
    const cost =
      v.costPrice && MONEY.test(v.costPrice) ? Number(v.costPrice) : null;
    const profit = cost !== null ? price - cost : null;
    const margin = profit !== null && price > 0 ? (profit / price) * 100 : null;
    return { vat, profit, margin };
  }, [v.price, v.taxRate, v.costPrice]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(v, isEdit);
    setErrors(found);
    const firstBad = (Object.keys(FIELD_IDS) as (keyof Values)[]).find(
      (k) => found[k],
    );
    if (firstBad) {
      document.getElementById(FIELD_IDS[firstBad])?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      await call(isEdit ? `/products/${product.id}` : "/products", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(toPayload(v, isEdit)),
      });
      toast.success(isEdit ? "Product updated" : "Product added");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // the server names the clashing field
        const m = err.message.toLowerCase();
        if (m.includes("sku")) {
          setErrors({ sku: err.message });
          document.getElementById(FIELD_IDS.sku)?.focus();
        } else if (m.includes("barcode")) {
          setErrors({ barcode: err.message });
          document.getElementById(FIELD_IDS.barcode)?.focus();
        } else setServerError(err.message);
      } else {
        setServerError(
          err instanceof Error ? err.message : "Could not save the product",
        );
      }
      requestAnimationFrame(() =>
        alertRef.current?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div ref={alertRef}>
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* ---------- Details ---------- */}
        <FieldSet>
          <FieldLegend variant="label">Details</FieldLegend>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="p-name">Name</FieldLabel>
              <Input
                id="p-name"
                autoComplete="off"
                autoFocus
                className="h-11 bg-background"
                {...text("name")}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.sku}>
                <FieldLabel htmlFor="p-sku">SKU</FieldLabel>
                <Input
                  id="p-sku"
                  autoComplete="off"
                  className="h-11 bg-background"
                  {...text("sku")}
                />
                {errors.sku && <FieldError>{errors.sku}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.barcode}>
                <FieldLabel htmlFor="p-barcode">Barcode (optional)</FieldLabel>
                <Input
                  id="p-barcode"
                  autoComplete="off"
                  inputMode="numeric"
                  className="h-11 bg-background"
                  placeholder="Scan or type"
                  // Scanners finish with Enter; don't let that submit the form.
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById(FIELD_IDS.categoryId)?.focus();
                    }
                  }}
                  {...text("barcode")}
                />
                {errors.barcode && <FieldError>{errors.barcode}</FieldError>}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="p-category">Category</FieldLabel>
              <Select
                items={categoryItems}
                value={v.categoryId}
                onValueChange={(val) => set("categoryId")(val ?? NONE)}
              >
                <SelectTrigger
                  id="p-category"
                  className="h-11 w-full bg-background"
                >
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </FieldSet>

        {/* ---------- Pricing ---------- */}
        <FieldSet>
          <FieldLegend variant="label">Pricing</FieldLegend>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.price}>
                <FieldLabel htmlFor="p-price">Selling price (KSh)</FieldLabel>
                <Input
                  id="p-price"
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-11 bg-background"
                  onFocus={selectOnFocus}
                  {...text("price")}
                />
                <FieldDescription>
                  What the customer pays, VAT included.
                </FieldDescription>
                {errors.price && <FieldError>{errors.price}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.costPrice}>
                <FieldLabel htmlFor="p-cost">Cost price (KSh)</FieldLabel>
                <Input
                  id="p-cost"
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-11 bg-background"
                  onFocus={selectOnFocus}
                  {...text("costPrice")}
                />
                <FieldDescription>
                  What you pay. Used for profit; never shown at the till.
                </FieldDescription>
                {errors.costPrice && (
                  <FieldError>{errors.costPrice}</FieldError>
                )}
              </Field>
            </div>

            <Field data-invalid={!!errors.taxRate}>
              <FieldLabel htmlFor="p-vat">VAT rate (%)</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                {VAT_PRESETS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={v.taxRate === r ? "default" : "outline"}
                    aria-pressed={v.taxRate === r}
                    className="h-11 min-w-16"
                    onClick={() => set("taxRate")(r)}
                  >
                    {r}%
                  </Button>
                ))}
                <Input
                  id="p-vat"
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-11 w-24 "
                  onFocus={selectOnFocus}
                  {...text("taxRate")}
                />
              </div>
              <FieldDescription>
                16% standard, 8% for fuel and similar, 0% for zero-rated or
                exempt items. You can confirm the exact tax class later in eTIMS
                tax review.
              </FieldDescription>
              {errors.taxRate && <FieldError>{errors.taxRate}</FieldError>}
            </Field>

            {breakdown &&
              (breakdown.vat !== null || breakdown.profit !== null) && (
                <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm">
                  {breakdown.vat !== null && (
                    <div>
                      <dt className="text-muted-foreground">
                        VAT in the price
                      </dt>
                      <dd className="font-medium">
                        KSh {ksh.format(breakdown.vat)}
                      </dd>
                    </div>
                  )}
                  {breakdown.profit !== null && (
                    <div>
                      <dt className="text-muted-foreground">
                        Gross profit per item
                      </dt>
                      <dd
                        className={
                          breakdown.profit < 0
                            ? "font-medium text-destructive"
                            : "font-medium"
                        }
                      >
                        KSh {ksh.format(breakdown.profit)}
                        {breakdown.margin !== null &&
                          ` (${breakdown.margin.toFixed(0)}%)`}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
          </FieldGroup>
        </FieldSet>

        {/* ---------- Stock ---------- */}
        <FieldSet>
          <FieldLegend variant="label">Stock</FieldLegend>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.reorderLevel}>
                <FieldLabel htmlFor="p-reorder">Reorder level</FieldLabel>
                <Input
                  id="p-reorder"
                  inputMode="numeric"
                  autoComplete="off"
                  className="h-11 bg-background"
                  onFocus={selectOnFocus}
                  {...text("reorderLevel")}
                />
                <FieldDescription>
                  Flagged as low stock at or below this.
                </FieldDescription>
                {errors.reorderLevel && (
                  <FieldError>{errors.reorderLevel}</FieldError>
                )}
              </Field>

              {!isEdit && (
                <Field data-invalid={!!errors.initialStock}>
                  <FieldLabel htmlFor="p-stock">Opening stock</FieldLabel>
                  <Input
                    id="p-stock"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-11 bg-background"
                    onFocus={selectOnFocus}
                    {...text("initialStock")}
                  />
                  <FieldDescription>
                    Recorded as the opening quantity.
                  </FieldDescription>
                  {errors.initialStock && (
                    <FieldError>{errors.initialStock}</FieldError>
                  )}
                </Field>
              )}
            </div>

            {isEdit && (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Current stock:{" "}
                <span className="font-medium text-foreground">
                  {product.stockQty}
                </span>
                . To change it, use Inventory so the change is recorded.
              </p>
            )}
          </FieldGroup>
        </FieldSet>

        {/* Sticky so the buttons stay visible while the form scrolls */}
        <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 bg-transparent px-1 pt-3 pb-1">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-11 min-w-32"
            disabled={submitting || (isEdit && !dirty)}
            aria-busy={submitting}
          >
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Add product"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
