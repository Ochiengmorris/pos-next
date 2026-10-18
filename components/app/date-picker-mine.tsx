"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = { after: new Date() },
  className,
}: {
  value: string; // "yyyy-MM-dd" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: Matcher; // defaults to blocking future dates
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = value ? parseISO(value) : undefined;

  function commit(date: Date | undefined) {
    const next = date ? fmt(date) : "";
    // Skip the refetch and page reset if nothing changed
    if (next !== value) onChange(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label="Date"
            className={cn(
              "flex h-11 w-56 justify-between gap-2 bg-card font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="truncate">
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </span>
        <CalendarIcon className="size-4 shrink-0" />
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          defaultMonth={selected}
          selected={selected}
          onSelect={commit}
          disabled={disabled}
        />
        {/* {selected && (
          <div className="flex justify-start border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => commit(undefined)}
            >
              <X className="mr-1 size-4" />
              Clear
            </Button>
          </div>
        )} */}
      </PopoverContent>
    </Popover>
  );
}
