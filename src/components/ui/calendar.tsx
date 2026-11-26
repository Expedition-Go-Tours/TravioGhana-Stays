import * as React from "react";
import { DayPicker, type ClassNames } from "react-day-picker";
import "react-day-picker/style.css";

import { ChevronLeft, ChevronRight } from "@/features/stays/icons";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./variants";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * The one month grid used by every date picker in the app.
 *
 * Styled with the Travio tokens rather than DayPicker's default palette, so it
 * follows light/dark mode and matches the rest of the form controls. The
 * Availability workspace keeps its own custom availability grid; this is for
 * choosing a date, not browsing inventory.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames: Partial<ClassNames> = {
    months: "relative flex flex-col sm:flex-row gap-4",
    month: "w-full",
    month_caption: "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
    caption_label: "text-sm font-medium text-ink",
    nav: "absolute top-0 flex w-full justify-between z-10",
    button_previous: cn(
      buttonVariants({ variant: "ghost", size: "iconSm" }),
      "p-0 text-muted hover:text-ink",
    ),
    button_next: cn(
      buttonVariants({ variant: "ghost", size: "iconSm" }),
      "p-0 text-muted hover:text-ink",
    ),
    chevron: "size-4",
    weekday: "size-9 p-0 text-xs font-medium text-muted",
    day_button:
      "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-ink outline-offset-2 group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150 focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-surface-strong group-data-[selected]:bg-brand hover:text-ink group-data-[selected]:text-on-brand group-data-[disabled]:text-ink/30 group-data-[disabled]:line-through group-data-[outside]:text-ink/30 group-data-[outside]:group-data-[selected]:text-on-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none group-[.range-middle]:rounded-none group-data-[selected]:group-[.range-middle]:bg-brand-soft group-data-[selected]:group-[.range-middle]:text-ink",
    day: "group size-9 px-0 text-sm",
    range_start: "range-start",
    range_end: "range-end",
    range_middle: "range-middle",
    today:
      "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-brand-ink [&[data-selected]:not(.range-middle)>*]:after:bg-surface [&[data-disabled]>*]:after:bg-ink/30 *:after:transition-colors",
    outside: "text-subtle data-[selected]:bg-brand-soft data-[selected]:text-muted",
    hidden: "invisible",
    week_number: "size-9 p-0 text-xs font-medium text-muted",
  };

  const mergedClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof ClassNames]
        ? cn(defaultClassNames[key as keyof ClassNames], classNames[key as keyof ClassNames])
        : defaultClassNames[key as keyof ClassNames],
    }),
    {} as Partial<ClassNames>,
  );

  const defaultComponents = {
    Chevron: ({ className: chevronClassName, orientation }: { className?: string; orientation?: string }) => {
      const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
      return <Icon className={chevronClassName} size={16} aria-hidden="true" />;
    },
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("w-fit", className)}
      classNames={mergedClassNames}
      components={{ ...defaultComponents, ...userComponents }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
