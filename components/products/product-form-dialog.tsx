"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
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
  const [v, setV] = useState<Values>(() => initialValues(product));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof Values) => (value: string) =>
    setV((cur) => ({ ...cur, [field]: value }));
  const text = (field: keyof Values) => ({
    value: v[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(field)(e.target.value),
    "aria-invalid": !!errors[field],
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(v, isEdit);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

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
        if (m.includes("sku")) setErrors({ sku: err.message });
        else if (m.includes("barcode")) setErrors({ barcode: err.message });
        else setServerError(err.message);
      } else {
        setServerError(
          err instanceof Error ? err.message : "Could not save the product",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="p-name">Name</FieldLabel>
          <Input
            id="p-name"
            autoComplete="off"
            autoFocus
            className="h-11"
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
              className="h-11"
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
              className="h-11"
              {...text("barcode")}
            />
            {errors.barcode && <FieldError>{errors.barcode}</FieldError>}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="p-category">Category</FieldLabel>
          <Select
            value={v.categoryId}
            onValueChange={(val) => set("categoryId")(val ?? NONE)}
          >
            <SelectTrigger id="p-category" className="h-11 w-full">
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="p-price">Selling price (KSh)</FieldLabel>
            <Input
              id="p-price"
              inputMode="decimal"
              autoComplete="off"
              className="h-11"
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
              className="h-11"
              {...text("costPrice")}
            />
            <FieldDescription>
              What you pay. Used for profit; never shown at the till.
            </FieldDescription>
            {errors.costPrice && <FieldError>{errors.costPrice}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.taxRate}>
            <FieldLabel htmlFor="p-vat">VAT rate (%)</FieldLabel>
            <Input
              id="p-vat"
              inputMode="decimal"
              autoComplete="off"
              className="h-11"
              {...text("taxRate")}
            />
            <FieldDescription>
              Use 0 for zero-rated or exempt items.
            </FieldDescription>
            {errors.taxRate && <FieldError>{errors.taxRate}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.reorderLevel}>
            <FieldLabel htmlFor="p-reorder">Reorder level</FieldLabel>
            <Input
              id="p-reorder"
              inputMode="numeric"
              autoComplete="off"
              className="h-11"
              {...text("reorderLevel")}
            />
            <FieldDescription>
              Flagged as low stock at or below this.
            </FieldDescription>
            {errors.reorderLevel && (
              <FieldError>{errors.reorderLevel}</FieldError>
            )}
          </Field>
        </div>

        {isEdit ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Current stock:{" "}
            <span className="font-medium text-foreground">
              {product.stockQty}
            </span>
            . To change it, use Inventory so the change is recorded.
          </p>
        ) : (
          <Field data-invalid={!!errors.initialStock}>
            <FieldLabel htmlFor="p-stock">Opening stock</FieldLabel>
            <Input
              id="p-stock"
              inputMode="numeric"
              autoComplete="off"
              className="h-11"
              {...text("initialStock")}
            />
            <FieldDescription>
              Recorded as the opening quantity. Later changes go through
              Inventory.
            </FieldDescription>
            {errors.initialStock && (
              <FieldError>{errors.initialStock}</FieldError>
            )}
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-2">
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
            disabled={submitting}
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
