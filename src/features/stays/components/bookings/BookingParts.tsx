import { Avatar, Money, StatusBadge } from "@/components/ui";
import type { BookingListItem, CurrencyCode } from "@/types/stays";
import { formatStayRange, nightsBetween, nightsLabel } from "../../utils/stayDates";

/**
 * Pieces of a reservation row shared by the dashboard and the Bookings page,
 * so a booking reads the same wherever it appears.
 */

/** Avatar, guest name and booking reference. */
export function GuestCell({ booking, size = "sm" }: { booking: BookingListItem; size?: "sm" | "md" }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={booking.guest} size={size} decorative />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{booking.guest}</span>
        <span className="block font-mono text-caption text-muted">{booking.id}</span>
      </span>
    </span>
  );
}

/** "Oct 4 – 8" over "4 nights"; with `withProperty`, the nights join the first line and the property takes the second. */
export function StayDates({ booking, withProperty = false }: { booking: BookingListItem; withProperty?: boolean }) {
  const nights = nightsLabel(nightsBetween(booking.from, booking.to));
  const range = formatStayRange(booking.from, booking.to);
  if (withProperty) {
    return (
      <span className="block min-w-0">
        <span className="block whitespace-nowrap text-ink">
          {range}
          {nights && <span className="text-muted"> · {nights}</span>}
        </span>
        <span className="block max-w-[14rem] truncate text-caption text-muted">{booking.propertyName}</span>
      </span>
    );
  }
  return (
    <span className="block whitespace-nowrap">
      <span className="text-ink">{range}</span>
      {nights && <span className="block text-caption text-muted">{nights}</span>}
    </span>
  );
}

/** Property name over the room. */
export function PropertyCell({ booking }: { booking: BookingListItem }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate text-ink">{booking.propertyName}</span>
      {booking.room && <span className="block truncate text-caption text-muted">{booking.room}</span>}
    </span>
  );
}

export function BookingAmount({ booking, currency }: { booking: BookingListItem; currency?: CurrencyCode }) {
  return <Money amount={booking.amount} currency={booking.currency ?? currency} className="font-semibold text-ink" />;
}

/** The phone card: guest and status, property and room, dates and amount. */
export function ReservationCard({ booking, currency }: { booking: BookingListItem; currency?: CurrencyCode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <GuestCell booking={booking} />
        <StatusBadge domain="booking" status={booking.status} />
      </div>
      <p className="truncate text-sm text-body">
        {booking.propertyName}
        {booking.room && <span className="text-muted"> · {booking.room}</span>}
      </p>
      <div className="flex items-end justify-between gap-3 text-sm">
        <StayDates booking={booking} />
        <BookingAmount booking={booking} currency={currency} />
      </div>
    </div>
  );
}
