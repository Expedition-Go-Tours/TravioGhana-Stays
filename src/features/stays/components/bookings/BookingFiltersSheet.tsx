import { useState } from "react";
import { Button, Field, Input, NativeSelect, Sheet, SheetContent } from "@/components/ui";
import type { BookingListItem } from "@/types/stays";
import { applyFilters, BOOKING_SORTS, EMPTY_FILTERS, type BookingFilters, type BookingSort } from "./bookingList";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The filters in effect; the sheet edits a copy until "Show results". */
  filters: BookingFilters;
  onApply: (filters: BookingFilters) => void;
  /** Bookings in the current tab, to preview how many a draft would show. */
  bookings: BookingListItem[];
  properties: { id: string; name: string }[];
};

/**
 * Render with a `key` that changes on every open.
 *
 * Property and check-in date filters (plus sort on phones, where the toolbar
 * has no room for it). Changes apply on "Show results", with a live count,
 * so a phone user is not re-filtering the list behind the sheet on every tap.
 */
export function BookingFiltersSheet({ open, onOpenChange, filters, onApply, bookings, properties }: Props) {
  // The parent remounts this (new `key`) each time it opens, so the draft
  // always starts from the filters in effect.
  const [draft, setDraft] = useState<BookingFilters>(filters);

  const count = applyFilters(bookings, draft).length;
  const update = (patch: Partial<BookingFilters>) => setDraft((current) => ({ ...current, ...patch }));
  const datesInvalid = Boolean(draft.from && draft.to && draft.to < draft.from);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Filter bookings"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => setDraft({ ...EMPTY_FILTERS, query: draft.query, sort: draft.sort })}
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
              {count === 1 ? "Show 1 booking" : `Show ${count.toLocaleString("en-US")} bookings`}
            </Button>
          </div>
        }
      >
        <div className="grid gap-5">
          <Field label="Property">
            <NativeSelect value={draft.propertyId} onChange={(event) => update({ propertyId: event.target.value })}>
              <option value="">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <fieldset className="grid gap-3">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Check-in date</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Input type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => update({ from: event.target.value })} />
              </Field>
              <Field label="To" error={datesInvalid ? "Must be on or after the start date." : undefined}>
                <Input type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => update({ to: event.target.value })} />
              </Field>
            </div>
          </fieldset>

          <Field label="Sort by" className="md:hidden">
            <NativeSelect value={draft.sort} onChange={(event) => update({ sort: event.target.value as BookingSort })}>
              {BOOKING_SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}
