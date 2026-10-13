"use client";

import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/pos/types";

export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const chips: { id: string | null; name: string }[] = [
    { id: null, name: "All" },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <div
      role="group"
      aria-label="Product categories"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {chips.map((c) => (
        <Button
          key={c.id ?? "all"}
          type="button"
          variant={value === c.id ? "default" : "outline"}
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
          className="h-11 shrink-0 rounded-full px-5"
        >
          {c.name}
        </Button>
      ))}
    </div>
  );
}
