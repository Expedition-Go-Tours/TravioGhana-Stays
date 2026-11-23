import { StatusBadge, type DataColumn } from "@/components/ui";
import type { BookingListItem, CurrencyCode } from "@/types/stays";
import { BookingAmount, GuestCell, PropertyCell, StayDates } from "./BookingParts";

type Options = {
  /** Wide enough for a separate Property column; otherwise the property sits under the dates. */
  roomy: boolean;
  /** Fallback when a booking carries no currency of its own. */
  currency?: CurrencyCode;
  /** Adds the party-size column (the Bookings page; the dashboard leaves it out). */
  withGuests?: boolean;
};

/** Reservation table columns shared by the dashboard and the Bookings page. */
export function reservationColumns({ roomy, currency, withGuests = false }: Options): DataColumn<BookingListItem>[] {
  const columns: (DataColumn<BookingListItem> | false)[] = [
    { key: "guest", header: "Guest", cell: (booking) => <GuestCell booking={booking} /> },
    {
      key: "stay",
      header: "Stay",
      cell: (booking) => <StayDates booking={booking} withProperty={!roomy} />,
    },
    roomy && { key: "property", header: "Property", cell: (booking) => <PropertyCell booking={booking} /> },
    withGuests && {
      key: "guests",
      header: "Guests",
      align: "right",
      cell: (booking) => <span className="figures">{Number(booking.guests) || 1}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (booking) => <BookingAmount booking={booking} currency={currency} />,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      cell: (booking) => <StatusBadge domain="booking" status={booking.status} />,
    },
  ];
  return columns.filter((column): column is DataColumn<BookingListItem> => Boolean(column));
}
