import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/tooltip";
import { controlClasses } from "@/components/ui/variants";
import { Calendar as CalendarIcon } from "@/features/stays/icons";
import { cn } from "@/lib/utils";

export type DateRangePickerProps = {
  value?: DateRange | null;
  onChange?: (range: DateRange | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
};

function formatRange(range?: DateRange | null) {
  if (!range?.from) return "";
  if (!range.to || range.from.getTime() === range.to.getTime()) {
    return format(range.from, "d MMM yyyy");
  }
  return `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`;
}

/** Two-month date-range picker with an Apply/Cancel panel. */
export default function DateRangePicker({
  value,
  onChange,
  label = "Date range",
  placeholder = "Select dates",
  className,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value ?? undefined);
  const text = formatRange(value);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setDraft(value ?? undefined);
  };

  const apply = () => {
    onChange?.(draft);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${text || placeholder}`}
          className={cn(controlClasses, "flex h-11 items-center justify-between gap-2 text-left", className)}
        >
          <span className={cn("truncate", !text && "text-subtle")}>{text || placeholder}</span>
          <CalendarIcon size={16} className="shrink-0 text-subtle" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] p-3" align="start">
        <Calendar
          mode="range"
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={2}
          weekStartsOn={1}
          defaultMonth={draft?.from ?? value?.from ?? new Date()}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
        />
        <div className="mt-3 flex justify-end gap-2 border-t border-hairline pt-3">
          <Button type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={apply} disabled={!draft?.from || !draft?.to}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
