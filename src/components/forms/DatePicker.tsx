import { forwardRef, useState } from "react";
import { endOfDay, format, startOfDay } from "date-fns";
import type { Matcher } from "react-day-picker";

import { Calendar as CalendarIcon } from "@/features/stays/icons";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/tooltip";
import { controlClasses } from "@/components/ui/variants";
import {
  DATE_PICKER_DISPLAY_FORMAT,
  formatPickerDate,
  parsePickerDate,
} from "@/lib/datePickerUtils";

export type DatePickerProps = {
  /** The stored value (`yyyy-MM-dd`) or a Date. */
  value?: string | Date | null;
  /** Emits an ISO date (`yyyy-MM-dd`), or an empty string when cleared. */
  onChange?: (value: string) => void;
  minDate?: string | Date | null;
  maxDate?: string | Date | null;
  placeholder?: string;
  className?: string;
  error?: unknown;
  disabled?: boolean;
  id?: string;
  name?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean;
};

/**
 * The app's date picker: a form-control trigger that opens the shared
 * `Calendar` in a Radix popover. Values stay ISO (`yyyy-MM-dd`) to match the
 * API and native date inputs it replaces; the trigger reads as `dd/MM/yyyy`.
 *
 * The Availability workspace's month grid is separate: it shows inventory and
 * is deliberately not built on this control.
 */
const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = "Select date",
    className,
    error = false,
    disabled = false,
    id,
    name,
    size = "md",
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const selected = parsePickerDate(value);
  const parsedMin = parsePickerDate(minDate);
  const parsedMax = parsePickerDate(maxDate);
  // Treat bounds as whole days: a Date with a time must not disable its own day.
  const min = parsedMin ? startOfDay(parsedMin) : null;
  const max = parsedMax ? endOfDay(parsedMax) : null;
  const today = new Date();
  const defaultMonth = selected ?? (min && min > today ? min : today);
  const invalid = Boolean(error) || ariaInvalid === true || ariaInvalid === "true";

  const disabledDays: Matcher[] = [];
  if (min) disabledDays.push({ before: min });
  if (max) disabledDays.push({ after: max });

  const handleSelect = (date?: Date) => {
    onChange?.(date ? formatPickerDate(date) : "");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          id={id}
          name={name}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || undefined}
          aria-required={ariaRequired || undefined}
          className={cn(
            controlClasses,
            "flex h-11 items-center justify-between gap-2 text-left",
            size === "sm" && "h-9",
            !selected && "text-subtle",
            className,
          )}
        >
          <span className="truncate">
            {selected ? format(selected, DATE_PICKER_DISPLAY_FORMAT) : placeholder}
          </span>
          <CalendarIcon size={16} className="shrink-0 text-subtle" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[24rem] max-w-[calc(100vw-1rem)] p-4" align="start" aria-label="Choose date">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          startMonth={min ?? undefined}
          endMonth={max ?? undefined}
          disabled={disabledDays.length ? disabledDays : undefined}
          autoFocus
          className="w-full"
          classNames={{
            caption_label: "text-base font-semibold",
            weekday: "size-12 text-sm",
            day: "size-12",
            day_button: "size-12",
          }}
        />
      </PopoverContent>
    </Popover>
  );
});

DatePicker.displayName = "DatePicker";

export default DatePicker;
