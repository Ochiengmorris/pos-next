"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ksh } from "@/lib/cash/format";

const DENOMS = [1000, 500, 200, 100, 50, 40, 20, 10, 5, 1];

export function DenominationCounter({
  onTotal,
}: {
  onTotal: (total: number) => void;
}) {
  const [counts, setCounts] = useState<Record<number, string>>({});
  const total = (c: Record<number, string>) =>
    DENOMS.reduce((s, d) => s + d * (Number(c[d]) || 0), 0);

  return (
    <details className="rounded-lg border border-secondary/20 shadow-2xl p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Count notes and coins
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {DENOMS.map((d) => (
          <label key={d} className="grid gap-1">
            <span className="text-xs text-muted-foreground">
              {d.toLocaleString()} ×
            </span>
            <Input
              inputMode="numeric"
              className="h-10 tabular-nums"
              aria-label={`Number of ${d} shilling notes or coins`}
              value={counts[d] ?? ""}
              onChange={(e) => {
                const next = {
                  ...counts,
                  [d]: e.target.value.replace(/\D/g, "").slice(0, 5),
                };
                setCounts(next);
                onTotal(total(next));
              }}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 font-semibold tabular-nums">
        Total: {ksh(total(counts))}
      </p>
    </details>
  );
}
