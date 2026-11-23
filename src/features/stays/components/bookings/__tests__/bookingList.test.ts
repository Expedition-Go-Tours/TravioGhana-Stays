import { describe, expect, it } from "vitest";
import type { BookingListItem, PropertyListItem } from "@/types/stays";
import {
  actionsFor,
  activeFilterCount,
  applyFilters,
  bookedValue,
  EMPTY_FILTERS,
  filtersFromParams,
  inTab,
  sortBookings,
  tabCounts,
  writeFilters,
} from "../bookingList";
import { EMPTY_BOOKING_FORM, validateBookingForm } from "../createBookingForm";

const booking = (overrides: Partial<BookingListItem>): BookingListItem => ({
  id: "TG-S-1",
  guest: "Guest",
  propertyId: "p1",
  propertyName: "Akwaaba Coast Hotel",
  room: "Deluxe King Room",
  from: "2026-10-04",
  to: "2026-10-08",
  amount: 100,
  status: "Confirmed",
  guests: 2,
  ...overrides,
});

const ROWS = [
  booking({ id: "A", guest: "Sarah Johnson", from: "2026-10-04", amount: 3000, status: "Confirmed" }),
  booking({ id: "B", guest: "kwame Agyeman", from: "2026-10-10", amount: 1700, status: "New" }),
  booking({ id: "C", guest: "Emily Carter", from: "2026-11-04", amount: 1400, status: "Cancelled", propertyId: "p2", propertyName: "Labadi Villa" }),
  booking({ id: "D", guest: "Mark Addo", from: "2026-09-11", amount: 700, status: "No-show" }),
];

describe("tabs", () => {
  it("groups no-shows with cancellations and counts every tab", () => {
    expect(inTab(ROWS[3], "cancelled")).toBe(true);
    expect(inTab(ROWS[3], "all")).toBe(true);
    expect(inTab(ROWS[3], "new")).toBe(false);
    expect(tabCounts(ROWS)).toEqual({ all: 4, new: 1, confirmed: 1, "checked-in": 0, completed: 0, cancelled: 2 });
  });
});

describe("filters in the URL", () => {
  it("ignores malformed values", () => {
    const filters = filtersFromParams(new URLSearchParams("q=sarah&from=2026-13&to=2026-10-31&sort=evil&property=p1"));
    expect(filters).toEqual({ query: "sarah", propertyId: "p1", from: "", to: "2026-10-31", sort: "checkin-desc" });
    expect(filtersFromParams(new URLSearchParams(`q=${"x".repeat(500)}`)).query).toHaveLength(100);
  });

  it("writes only non-default values and keeps unrelated parameters", () => {
    const params = writeFilters(new URLSearchParams("tab=new&bookingId=A&q=old"), {
      ...EMPTY_FILTERS,
      query: "  emily ",
      to: "2026-11-30",
    });
    expect(params.toString()).toBe("tab=new&bookingId=A&q=emily&to=2026-11-30");
    expect(writeFilters(params, EMPTY_FILTERS).toString()).toBe("tab=new&bookingId=A");
  });

  it("round-trips", () => {
    const filters = { query: "addo", propertyId: "p2", from: "2026-09-01", to: "2026-09-30", sort: "amount-desc" as const };
    expect(filtersFromParams(writeFilters(new URLSearchParams(), filters))).toEqual(filters);
  });

  it("counts the sheet filters but not search or sort", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: "x", sort: "guest-asc" })).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, propertyId: "p1", from: "2026-01-01" })).toBe(2);
  });
});

describe("applyFilters", () => {
  it("searches guest, reference and property, case-insensitively", () => {
    const ids = (query: string) => applyFilters(ROWS, { ...EMPTY_FILTERS, query }).map((row) => row.id);
    expect(ids("KWAME")).toEqual(["B"]);
    expect(ids("c")).toContain("C");
    expect(ids("labadi")).toEqual(["C"]);
    expect(ids("  ")).toHaveLength(4);
  });

  it("filters by property and an inclusive check-in range", () => {
    expect(applyFilters(ROWS, { ...EMPTY_FILTERS, propertyId: "p2" }).map((row) => row.id)).toEqual(["C"]);
    const range = applyFilters(ROWS, { ...EMPTY_FILTERS, from: "2026-10-04", to: "2026-10-10" });
    expect(range.map((row) => row.id).sort()).toEqual(["A", "B"]);
  });

  it("sorts", () => {
    expect(sortBookings(ROWS, "checkin-desc").map((row) => row.id)).toEqual(["C", "B", "A", "D"]);
    expect(sortBookings(ROWS, "checkin-asc").map((row) => row.id)).toEqual(["D", "A", "B", "C"]);
    expect(sortBookings(ROWS, "amount-desc").map((row) => row.id)).toEqual(["A", "B", "C", "D"]);
    expect(sortBookings(ROWS, "guest-asc").map((row) => row.guest)).toEqual([
      "Emily Carter",
      "kwame Agyeman",
      "Mark Addo",
      "Sarah Johnson",
    ]);
    // Sorting never mutates the input.
    expect(ROWS.map((row) => row.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("values only stays that will be paid", () => {
    expect(bookedValue(ROWS)).toBe(4700);
  });
});

describe("status actions", () => {
  it("moves a booking forward one step, and only open bookings can be cancelled", () => {
    expect(actionsFor("New").map((action) => action.to)).toEqual(["Confirmed", "Cancelled"]);
    expect(actionsFor("Confirmed").map((action) => action.to)).toEqual(["Checked in", "Cancelled"]);
    expect(actionsFor("Checked in").map((action) => action.to)).toEqual(["Completed"]);
    expect(actionsFor("Completed")).toEqual([]);
    expect(actionsFor("Cancelled")).toEqual([]);
    expect(actionsFor("Unknown")).toEqual([]);
    expect(actionsFor("New").find((action) => action.to === "Cancelled")?.destructive).toBe(true);
  });
});

describe("create-booking validation", () => {
  const properties = [
    { id: "p1", name: "Akwaaba", rooms: [{ id: "r1", name: "Deluxe", adults: 2, children: 1, price: 250 }] },
  ] as unknown as PropertyListItem[];
  const valid = {
    ...EMPTY_BOOKING_FORM,
    propertyId: "p1",
    roomId: "r1",
    guestName: "Ama",
    checkIn: "2026-12-01",
    checkOut: "2026-12-04",
    guests: "2",
  };

  it("accepts a complete form", () => {
    expect(validateBookingForm(valid, properties)).toEqual({});
  });

  it("names each problem", () => {
    expect(validateBookingForm(EMPTY_BOOKING_FORM, properties)).toEqual({
      propertyId: "Choose a property.",
      guestName: "Add the guest's name.",
      checkIn: "Choose the check-in date.",
      checkOut: "Choose the check-out date.",
    });
    expect(validateBookingForm({ ...valid, roomId: "" }, properties).roomId).toBe("Choose a room.");
    expect(validateBookingForm({ ...valid, guestEmail: "not-an-email" }, properties).guestEmail).toBeTruthy();
    expect(validateBookingForm({ ...valid, checkOut: "2026-12-01" }, properties).checkOut).toBe(
      "Check-out must be after check-in.",
    );
    expect(validateBookingForm({ ...valid, guests: "0" }, properties).guests).toBe("At least 1 guest.");
    expect(validateBookingForm({ ...valid, guests: "1.5" }, properties).guests).toBe("At least 1 guest.");
    expect(validateBookingForm({ ...valid, guests: "4" }, properties).guests).toBe("This room sleeps up to 3.");
  });
});
