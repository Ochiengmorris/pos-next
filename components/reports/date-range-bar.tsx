"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type FixedPreset,
  PRESET_LABEL,
  type Preset,
  type Range,
} from "@/lib/reports/range";
import { DateRangePicker } from "../app/date-range-picker";

export function DateRangeBar({
  preset,
  range,
  error,
  onPreset,
  onCustom,
}: {
  preset: Preset;
  range: Range;
  error: string | null;
  onPreset: (p: FixedPreset) => void;
  onCustom: (next: Range) => void;
}) {
  return (
    <div className="grid gap-2">
      <div
        role="group"
        aria-label="Report period"
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {(Object.keys(PRESET_LABEL) as FixedPreset[]).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={preset === p ? "default" : "ghost"}
              aria-pressed={preset === p}
              className="h-9"
              onClick={() => onPreset(p)}
            >
              {PRESET_LABEL[p]}
            </Button>
          ))}
        </div>
        {/* <label className="flex items-center gap-2 text-sm">
          From
          <Input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) =>
              e.target.value && onCustom({ ...range, from: e.target.value })
            }
            className="h-11 w-40 bg-card"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          To
          <Input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) =>
              e.target.value && onCustom({ ...range, to: e.target.value })
            }
            className="h-11 w-40 bg-card"
          />
        </label> */}

        <label htmlFor="date">
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={({ from, to }) => {
              onCustom({ ...range, to: to, from: from });
            }}
          />
        </label>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
