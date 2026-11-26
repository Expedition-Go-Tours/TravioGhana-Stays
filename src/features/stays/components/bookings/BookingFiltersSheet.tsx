import { Button, Field, Sheet, SheetContent } from "@/components/ui";
import DatePicker from "@/components/forms/DatePicker";
import { StaysSelect } from "../StaysForm";
import type { BookingListItem } from "@/types/stays";
import { applyFilters, BOOKING_SORTS, EMPTY_FILTERS, type BookingFilters, type BookingSort } from "./bookingList";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The editing copy; the page starts it from the applied filters on open. */
  draft: BookingFilters;
  onDraftChange: (draft: BookingFilters) => void;
  onApply: (filters: BookingFilters) => void;
  /** Reservations in the current tab, to preview how many a draft would show. */
  bookings: BookingListItem[];
  properties: { id: string; name: string }[];
};

/**
 * Property and check-in date filters (plus sort on phones, where the toolbar
 * has no room for it). Changes apply on "Show results", with a live count,
 * so a phone user is not re-filtering the list behind the sheet on every tap.
 *
 * The draft lives on the page and is reset when the sheet opens. Keeping the
 * sheet mounted lets Radix run its full enter and exit transition instead of
 * restarting the dialog on every open.
 */
export function BookingFiltersSheet({ open, onOpenChange, draft, onDraftChange, onApply, bookings, properties }: Props) {
  const count = applyFilters(bookings, draft).length;
  const update = (patch: Partial<BookingFilters>) => onDraftChange({ ...draft, ...patch });
  const datesInvalid = Boolean(draft.from && draft.to && draft.to < draft.from);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Filter reservations"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => onDraftChange({ ...EMPTY_FILTERS, query: draft.query, sort: draft.sort })}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              disabled={datesInvalid}
              onClick={() => {
                onApply(draft);
                onOpenChange(false);
              }}
            >
              {count === 1 ? "Show 1 reservation" : `Show ${count.toLocaleString("en-US")} reservations`}
            </Button>
          </div>
        }
      >
        <div className="grid gap-5">
          <Field label="Property">
            <StaysSelect
              options={[
                { value: "all", label: "All properties" },
                ...properties.map((property) => ({ value: property.id, label: property.name })),
              ]}
              value={draft.propertyId || "all"}
              onChange={(event) =>
                update({ propertyId: event.target.value === "all" ? "" : event.target.value })
              }
            />
          </Field>

          <fieldset className="grid gap-3">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Check-in date</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <DatePicker
                  value={draft.from}
                  maxDate={draft.to || undefined}
                  onChange={(value) => update({ from: value })}
                />
              </Field>
              <Field label="To" error={datesInvalid ? "Must be on or after the start date." : undefined}>
                <DatePicker
                  value={draft.to}
                  minDate={draft.from || undefined}
                  onChange={(value) => update({ to: value })}
                />
              </Field>
            </div>
          </fieldset>

          <Field label="Sort by" className="md:hidden">
            <StaysSelect
              options={BOOKING_SORTS}
              value={draft.sort}
              onChange={(event) => update({ sort: event.target.value as BookingSort })}
            />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}
