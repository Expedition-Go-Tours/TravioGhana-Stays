/**
 * Bookings list rules: the status tabs, the filters kept in the URL, sorting,
 * and which status changes each booking allows. Pure functions, so the page
 * and its tests share one definition.
 */
import type { BookingListItem, BookingStatus } from "@/types/stays";

/* ── Tabs ────────────────────────────────────────────────────────────────── */

export const BOOKING_TABS = [
  { value: "all", label: "All", statuses: null },
  { value: "new", label: "New", statuses: ["New"] },
  { value: "confirmed", label: "Confirmed", statuses: ["Confirmed"] },
  { value: "checked-in", label: "Checked in", statuses: ["Checked in"] },
  { value: "completed", label: "Completed", statuses: ["Completed"] },
  // No-shows sit with cancellations: both are stays that did not happen.
  { value: "cancelled", label: "Cancelled", statuses: ["Cancelled", "No-show"] },
] as const satisfies readonly { value: string; label: string; statuses: readonly BookingStatus[] | null }[];

export type BookingTab = (typeof BOOKING_TABS)[number]["value"];
export const BOOKING_TAB_VALUES = BOOKING_TABS.map((tab) => tab.value) as BookingTab[];

export function inTab(booking: BookingListItem, tab: BookingTab): boolean {
  const statuses = BOOKING_TABS.find((entry) => entry.value === tab)?.statuses;
  return !statuses || (statuses as readonly string[]).includes(booking.status);
}

export function tabCounts(bookings: BookingListItem[]): Record<BookingTab, number> {
  const counts = Object.fromEntries(BOOKING_TAB_VALUES.map((tab) => [tab, 0])) as Record<BookingTab, number>;
  for (const booking of bookings) {
    for (const tab of BOOKING_TAB_VALUES) if (inTab(booking, tab)) counts[tab] += 1;
  }
  return counts;
}

/* ── Filters ─────────────────────────────────────────────────────────────── */

export const BOOKING_SORTS = [
  { value: "checkin-desc", label: "Check-in, latest first" },
  { value: "checkin-asc", label: "Check-in, earliest first" },
  { value: "amount-desc", label: "Amount, highest first" },
  { value: "guest-asc", label: "Guest name, A–Z" },
] as const;

export type BookingSort = (typeof BOOKING_SORTS)[number]["value"];
export const DEFAULT_SORT: BookingSort = "checkin-desc";

export type BookingFilters = {
  query: string;
  propertyId: string;
  /** Check-in on or after (yyyy-MM-dd). */
  from: string;
  /** Check-in on or before (yyyy-MM-dd). */
  to: string;
  sort: BookingSort;
};

export const EMPTY_FILTERS: BookingFilters = { query: "", propertyId: "", from: "", to: "", sort: DEFAULT_SORT };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isSort = (value: string | null): value is BookingSort => BOOKING_SORTS.some((sort) => sort.value === value);

/** Filters from the URL. Malformed values are ignored rather than trusted. */
export function filtersFromParams(params: URLSearchParams): BookingFilters {
  const date = (key: string) => {
    const value = params.get(key) ?? "";
    return ISO_DATE.test(value) ? value : "";
  };
  const sort = params.get("sort");
  return {
    query: (params.get("q") ?? "").slice(0, 100),
    propertyId: params.get("property") ?? "",
    from: date("from"),
    to: date("to"),
    sort: isSort(sort) ? sort : DEFAULT_SORT,
  };
}

/** Writes filters into `params`, dropping empty and default values so URLs stay short. */
export function writeFilters(params: URLSearchParams, filters: BookingFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string, empty = "") => (value && value !== empty ? next.set(key, value) : next.delete(key));
  set("q", filters.query.trim());
  set("property", filters.propertyId);
  set("from", filters.from);
  set("to", filters.to);
  set("sort", filters.sort, DEFAULT_SORT);
  return next;
}

/** How many of the sheet's filters are set (search and sort are not counted). */
export function activeFilterCount(filters: BookingFilters): number {
  return [filters.propertyId, filters.from, filters.to].filter(Boolean).length;
}

export function applyFilters(bookings: BookingListItem[], filters: BookingFilters): BookingListItem[] {
  const query = filters.query.trim().toLowerCase();
  const rows = bookings.filter((booking) => {
    if (filters.propertyId && booking.propertyId !== filters.propertyId) return false;
    // Dates are yyyy-MM-dd, so string comparison is date comparison.
    if (filters.from && booking.from < filters.from) return false;
    if (filters.to && booking.from > filters.to) return false;
    if (!query) return true;
    return [booking.guest, booking.id, booking.propertyName, booking.room, booking.guestEmail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  return sortBookings(rows, filters.sort);
}

export function sortBookings(bookings: BookingListItem[], sort: BookingSort): BookingListItem[] {
  const rows = [...bookings];
  switch (sort) {
    case "checkin-asc":
      return rows.sort((a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id));
    case "amount-desc":
      return rows.sort((a, b) => Number(b.amount) - Number(a.amount) || a.id.localeCompare(b.id));
    case "guest-asc":
      return rows.sort((a, b) => a.guest.localeCompare(b.guest, "en", { sensitivity: "base" }));
    default:
      return rows.sort((a, b) => b.from.localeCompare(a.from) || a.id.localeCompare(b.id));
  }
}

/** Booking value of the rows that will actually be paid: cancellations and no-shows excluded. */
export function bookedValue(bookings: BookingListItem[]): number {
  return bookings
    .filter((booking) => booking.status !== "Cancelled" && booking.status !== "No-show")
    .reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0);
}

/* ── Status changes ──────────────────────────────────────────────────────── */

export type BookingAction = {
  to: BookingStatus;
  label: string;
  /** Toast after it succeeds. */
  done: string;
  /** Destructive: asks for confirmation first. */
  destructive?: boolean;
};

const CANCEL: BookingAction = { to: "Cancelled", label: "Cancel booking", done: "Booking cancelled", destructive: true };

export const BOOKING_ACTIONS: Record<BookingStatus, BookingAction[]> = {
  New: [{ to: "Confirmed", label: "Confirm booking", done: "Booking confirmed" }, CANCEL],
  Confirmed: [{ to: "Checked in", label: "Check in guest", done: "Guest checked in" }, CANCEL],
  "Checked in": [{ to: "Completed", label: "Mark as completed", done: "Stay marked as completed" }],
  Completed: [],
  Cancelled: [],
  "No-show": [],
};

export function actionsFor(status: string): BookingAction[] {
  return BOOKING_ACTIONS[status as BookingStatus] ?? [];
}
