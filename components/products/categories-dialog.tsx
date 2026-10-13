"use client";

import { type FormEvent, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/pos/types";
import { useApi } from "@/lib/use-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onChanged: () => void;
};

export function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  onChanged,
}: Props) {
  const call = useApi();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 2) return;
    const ok = await run(
      () =>
        call("/categories", {
          method: "POST",
          body: JSON.stringify({ name: newName.trim() }),
        }),
      "Category added",
    );
    if (ok) setNewName("");
  }

  async function rename(id: string) {
    if (editName.trim().length < 2) return;
    const ok = await run(
      () =>
        call(`/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: editName.trim() }),
        }),
      "Category renamed",
    );
    if (ok) setEditingId(null);
  }

  async function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setConfirmId(null);
    await run(
      () => call(`/categories/${id}`, { method: "DELETE" }),
      "Category deleted",
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            A category can only be deleted once it has no products.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            aria-label="New category name"
            className="h-11"
            autoComplete="off"
          />
          <Button
            type="submit"
            className="h-11"
            disabled={busy || newName.trim().length < 2}
          >
            Add
          </Button>
        </form>

        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No categories yet.
          </p>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-2">
                {editingId === c.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void rename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      aria-label={`Rename ${c.name}`}
                      className="h-10"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      aria-label="Save name"
                      disabled={busy}
                      onClick={() => void rename(c.id)}
                    >
                      <Check aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      aria-label="Cancel rename"
                      onClick={() => setEditingId(null)}
                    >
                      <X aria-hidden />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {c.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {c._count.products}{" "}
                        {c._count.products === 1 ? "product" : "products"}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      aria-label={`Rename ${c.name}`}
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    {c._count.products > 0 ? (
                      <span
                        className="w-10 text-center text-xs text-muted-foreground"
                        title="Move its products to another category first"
                      >
                        In use
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant={confirmId === c.id ? "destructive" : "ghost"}
                        className="h-10"
                        aria-label={`Delete ${c.name}`}
                        disabled={busy}
                        onClick={() => void remove(c.id)}
                      >
                        {confirmId === c.id ? (
                          "Confirm"
                        ) : (
                          <Trash2 aria-hidden />
                        )}
                      </Button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
