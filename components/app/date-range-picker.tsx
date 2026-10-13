"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

function toRange(from: string, to: string): DateRange | undefined {
  if (!from) return undefined;
  return { from: parseISO(from), to: to ? parseISO(to) : undefined };
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: {
  from: string; // committed value, "yyyy-MM-dd" or ""
  to: string; // committed value, "yyyy-MM-dd" or ""
  onChange: (range: { from: string; to: string }) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // What the calendar shows while picking. Not applied until Done.
  const [draft, setDraft] = useState<DateRange | undefined>(toRange(from, to));

  const committed = toRange(from, to);

  function handleOpenChange(next: boolean) {
    // Opening: start from the applied range.
    // Closing without Done (outside click / Esc): the draft is discarded.
    if (next) setDraft(committed);
    setOpen(next);
  }

  function handleDone() {
    const nextFrom = draft?.from ? fmt(draft.from) : "";
    // A single click counts as a one-day range
    const nextTo = draft?.from ? fmt(draft.to ?? draft.from) : "";

    // Skip the refetch and page reset if nothing changed
    if (nextFrom !== from || nextTo !== to) {
      onChange({ from: nextFrom, to: nextTo });
    }
    setOpen(false);
  }

  const label = committed?.from
    ? committed.to
      ? `${format(committed.from, "d MMM yyyy")} – ${format(committed.to, "d MMM yyyy")}`
      : format(committed.from, "d MMM yyyy")
    : "Pick a date range";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label="Date range"
            className={cn(
              "h-11 w-64 gap-2 bg-card font-normal flex justify-between",
              !committed?.from && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="truncate">{label}</span>
        <CalendarIcon className="size-4 shrink-0 " />
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={draft?.from}
          selected={draft}
          onSelect={setDraft}
          disabled={{ after: new Date() }}
        />
        <div className="flex justify-between border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!draft?.from}
            onClick={() => setDraft(undefined)}
          >
            <X className="mr-1 size-4" />
            Clear
          </Button>
          <Button type="button" size="sm" onClick={handleDone}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
