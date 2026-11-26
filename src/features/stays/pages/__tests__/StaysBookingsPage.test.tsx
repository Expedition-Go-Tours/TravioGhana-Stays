/**
 * Bookings: status tabs with counts, search / filters / sort kept in the URL,
 * a booking panel opened from a row or a `?bookingId=` link, status changes
 * (cancelling asks first), creating a booking, pagination, and the error
 * state — all against the mock dataset.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { differenceInCalendarMonths, format, parse, parseISO } from "date-fns";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    listStaysBookings: vi.fn(actual.listStaysBookings),
    updateBookingStatus: vi.fn(actual.updateBookingStatus),
  };
});

import StaysBookingsPage from "../StaysBookingsPage";
import { STAYS_MOCK_STORAGE_KEY, staysMock } from "../../mock/store";
import { listStaysBookings, updateBookingStatus } from "../../api";

const listBookings = vi.mocked(listStaysBookings);
const updateStatus = vi.mocked(updateBookingStatus);

/** Push extra reservations into the persisted mock db, then reload it. */
function seedExtraBookings(count: number) {
  const stored = JSON.parse(localStorage.getItem(STAYS_MOCK_STORAGE_KEY) as string);
  for (let index = 0; index < count; index += 1) {
    stored.db.bookings.push({
      id: `TG-S-9${String(index).padStart(4, "0")}`,
      guest: `Guest ${index + 1}`,
      propertyId: "p1",
      room: "Deluxe King Room",
      from: "2026-11-01",
      to: "2026-11-03",
      amount: 1000,
      status: "Confirmed",
      guests: 2,
    });
  }
  localStorage.setItem(STAYS_MOCK_STORAGE_KEY, JSON.stringify(stored));
  staysMock.reload();
}

function Location() {
  const location = useLocation();
  return <span data-testid="location">{location.search}</span>;
}

function renderPage(initial = "/stays/bookings") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/stays/bookings"
            element={
              <>
                <StaysBookingsPage />
                <Location />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const search = () => new URLSearchParams(screen.getByTestId("location").textContent ?? "");
/** Phone layout in jsdom (matchMedia → false): each booking is a list item. */
const rows = () => within(screen.getByRole("list", { name: "Reservations" })).getAllByRole("listitem");
const row = (id: string, guest: string) => screen.getByRole("listitem", { name: `Open reservation ${id} for ${guest}` });
const tab = (name: RegExp) => screen.getByRole("tab", { name });

/** Open a DatePicker inside `scope` and click the target day. */
async function pickDate(
  user: ReturnType<typeof userEvent.setup>,
  scope: HTMLElement,
  label: string | RegExp,
  iso: string,
) {
  await user.click(within(scope).getByLabelText(label));
  const calendar = await screen.findByRole("dialog", { name: "Choose date" });
  const target = parseISO(iso);
  const caption = within(calendar).getByRole("status").textContent ?? "";
  const shownMonth = parse(caption, "LLLL yyyy", new Date());
  const months = differenceInCalendarMonths(target, shownMonth);
  const nav = months > 0 ? "Go to the Next Month" : "Go to the Previous Month";
  for (let step = 0; step < Math.abs(months); step += 1) {
    await user.click(within(calendar).getByRole("button", { name: nav }));
  }
  await user.click(within(calendar).getByRole("button", { name: format(target, "PPPP") }));
}

beforeEach(() => {
  staysMock.reset();
  vi.clearAllMocks();
});

describe("StaysBookingsPage", () => {
  it("shows every booking with tab counts and the booked value", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Reservations" })).toBeTruthy();
    await waitFor(() => expect(rows()).toHaveLength(11));
    expect(tab(/^All\s*11$/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/^New\s*2$/)).toBeTruthy();
    expect(tab(/^Confirmed\s*4$/)).toBeTruthy();
    expect(tab(/^Checked in\s*0$/)).toBeTruthy();
    expect(tab(/^Checked-out\s*0$/)).toBeTruthy();
    // Four cancellations plus one no-show.
    expect(tab(/^Cancelled\s*5$/)).toBeTruthy();

    // Booked value excludes cancellations and no-shows.
    const summary = screen.getByText(/total$/).closest("p") as HTMLElement;
    expect(summary.textContent).toBe("11 reservations · $9,850.00 total");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("filters by tab and by search, and keeps both in the URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(11));

    await user.click(tab(/^New/));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows().map((row) => row.textContent).join(" ")).toContain("Kwame Agyeman");
    expect(rows().map((row) => row.textContent).join(" ")).toContain("Esi Danso");
    expect(search().get("tab")).toBe("new");

    await user.click(tab(/^All/));
    await user.type(screen.getByRole("searchbox", { name: "Search reservations" }), "TG-S-20495");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0].textContent).toContain("Rebecca Smith");
    expect(search().get("q")).toBe("TG-S-20495");
    expect(search().get("tab")).toBeNull();
  });

  it("restores tab and search from a shared link", async () => {
    renderPage("/stays/bookings?tab=cancelled&q=carter");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0].textContent).toContain("Emily Carter");
    expect(tab(/^Cancelled/)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("searchbox", { name: "Search reservations" })).toHaveValue("carter");
  });

  it("sorts by amount", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(11));

    await user.click(screen.getByRole("combobox", { name: "Sort reservations" }));
    await user.click(await screen.findByRole("option", { name: "Amount, highest first" }));
    await waitFor(() => expect(rows()[0].textContent).toContain("Sarah Johnson"));
    expect(rows()[10].textContent).toContain("Nana Yaw Owusu");
    expect(search().get("sort")).toBe("amount-desc");
  });

  it("filters by check-in date from the filters sheet, with a live count and removable chips", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(11));

    await user.click(screen.getByRole("button", { name: "Filters" }));
    const sheet = screen.getByRole("dialog", { name: "Filter reservations" });
    // Only Sarah (Oct 4), Kwame (Oct 10) and Rebecca (Oct 15) have fixed seed
    // dates; the others are relative to today, so the ranges avoid them.
    await pickDate(user, sheet, "From", "2026-10-04");
    await pickDate(user, sheet, "To", "2026-10-10");
    await user.click(within(sheet).getByRole("button", { name: "Show 2 reservations" }));

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows().map((item) => item.textContent)).toEqual([
      expect.stringContaining("Kwame Agyeman"),
      expect.stringContaining("Sarah Johnson"),
    ]);
    expect(search().get("from")).toBe("2026-10-04");
    expect(screen.getByRole("button", { name: "Filters, 2 active" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Remove filter: Check-in until Sat, Oct 10, 2026" }));
    await waitFor(() => expect(screen.getByRole("listitem", { name: /Rebecca Smith/ })).toBeTruthy());
    expect(search().get("to")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(rows()).toHaveLength(11));
  });

  it("reopens the filter sheet with the applied values", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(11));

    await user.click(screen.getByRole("button", { name: "Filters" }));
    const sheet = screen.getByRole("dialog", { name: "Filter reservations" });
    await user.click(within(sheet).getByLabelText("Property"));
    await user.click(await screen.findByRole("option", { name: "Kumasi Gardens Lodge" }));
    await user.click(within(sheet).getByRole("button", { name: "Show 1 reservation" }));
    await waitFor(() => expect(rows()).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("dialog", { name: "Filter reservations" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Property" })).toHaveTextContent("Kumasi Gardens Lodge");
  });

  it("says when nothing matches and offers to clear the filters", async () => {
    const user = userEvent.setup();
    renderPage("/stays/bookings?q=nobody-by-this-name");
    expect(await screen.findByText("No reservations match")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(rows()).toHaveLength(11));
  });

  it("opens a booking from its row and confirms it", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(11));

    await user.click(row("TG-S-20494", "Kwame Agyeman"));
    const panel = screen.getByRole("dialog", { name: "Kwame Agyeman" });
    expect(search().get("bookingId")).toBe("TG-S-20494");
    expect(within(panel).getByText("Sat, Oct 10, 2026")).toBeTruthy();
    expect(within(panel).getByText("$1,700.00")).toBeTruthy();

    await user.click(within(panel).getByRole("button", { name: "Confirm reservation" }));
    expect(await within(panel).findByRole("button", { name: "Check in guest" })).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Reservation confirmed");
    const stored = (await staysMock.listBookings()).find((booking) => booking.id === "TG-S-20494");
    expect(stored?.status).toBe("Confirmed");
  });

  it("asks before cancelling, and keeps the booking if you back out", async () => {
    const user = userEvent.setup();
    renderPage("/stays/bookings?bookingId=TG-S-20493");
    const panel = await screen.findByRole("dialog", { name: "Sarah Johnson" });

    await user.click(within(panel).getByRole("button", { name: "Cancel reservation" }));
    let confirm = screen.getByRole("alertdialog", { name: "Cancel this reservation?" });
    // Focus starts on the safe choice.
    expect(within(confirm).getByRole("button", { name: "Keep reservation" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Keep reservation" }));
    expect(updateStatus).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole("dialog", { name: "Sarah Johnson" })).getByRole("button", { name: "Cancel reservation" }));
    confirm = screen.getByRole("alertdialog", { name: "Cancel this reservation?" });
    await user.click(within(confirm).getByRole("button", { name: "Cancel reservation" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(updateStatus).toHaveBeenCalledWith("TG-S-20493", "Cancelled");
    expect(toast.success).toHaveBeenCalledWith("Reservation cancelled");
    // A cancelled booking has no further actions.
    const panelAfter = screen.getByRole("dialog", { name: "Sarah Johnson" });
    await waitFor(() => expect(within(panelAfter).queryByRole("button", { name: /Cancel reservation|Check in/ })).toBeNull());
  });

  it("reports a failed status change and leaves the booking as it was", async () => {
    const user = userEvent.setup();
    updateStatus.mockRejectedValueOnce(new Error("Server unavailable"));
    renderPage("/stays/bookings?bookingId=TG-S-20494");
    const panel = await screen.findByRole("dialog", { name: "Kwame Agyeman" });

    await user.click(within(panel).getByRole("button", { name: "Confirm reservation" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(within(panel).getByRole("button", { name: "Confirm reservation" })).toBeEnabled();
    expect((await staysMock.listBookings()).find((booking) => booking.id === "TG-S-20494")?.status).toBe("New");
  });

  it("opens straight to a booking from a link, and explains an unknown one", async () => {
    const { unmount } = renderPage("/stays/bookings?bookingId=TG-S-20493");
    expect(await screen.findByRole("dialog", { name: "Sarah Johnson" })).toBeTruthy();
    unmount();

    const user = userEvent.setup();
    renderPage("/stays/bookings?bookingId=TG-S-00000");
    expect(await screen.findByText("We couldn't find this reservation")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to reservations" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(search().get("bookingId")).toBeNull();
  });

  it("creates a booking after checking the form, then opens it", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(11));

    await user.click(screen.getByRole("button", { name: "Create reservation" }));
    const dialog = screen.getByRole("dialog", { name: "Create reservation" });
    await waitFor(() => expect(within(dialog).getByLabelText(/^Property/)).not.toBeDisabled());

    await user.click(within(dialog).getByRole("button", { name: "Create reservation" }));
    expect(within(dialog).getByText("Choose a property.")).toBeTruthy();
    expect(within(dialog).getByText("Add the guest's name.")).toBeTruthy();
    // Focus moves to the first field with a problem.
    await waitFor(() => expect(within(dialog).getByLabelText(/^Property/)).toHaveFocus());

    await user.click(within(dialog).getByLabelText(/^Property/));
    await user.click(await screen.findByRole("option", { name: "Akwaaba Coast Hotel" }));
    await user.click(within(dialog).getByLabelText(/^Room/));
    await user.click(await screen.findByRole("option", { name: "Deluxe King Room" }));
    await user.type(within(dialog).getByLabelText(/^Guest name/), "Ama Mensah");
    await pickDate(user, dialog, /^Check-in/, "2026-12-01");
    await pickDate(user, dialog, /^Check-out/, "2026-12-04");
    expect(within(dialog).getByText(/Estimated total · 3 nights/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Create reservation" }));

    expect(await screen.findByRole("dialog", { name: "Ama Mensah" })).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Reservation created for Ama Mensah");
    expect(search().get("bookingId")).toMatch(/^TG-S-\d{5}$/);
    // The open panel hides the page from assistive tech, hence `hidden`.
    await waitFor(() => expect(screen.getByRole("tab", { name: /^All\s*12$/, hidden: true })).toBeTruthy());
  });

  it("paginates once the list passes 25 bookings", async () => {
    seedExtraBookings(27); // 11 seeded + 27 = 38 → 2 pages
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(rows()).toHaveLength(25));
    expect(screen.getByText(/total$/).closest("p")?.textContent).toMatch(/^38 reservations/);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(rows()).toHaveLength(13));

    // A new filter goes back to page 1.
    await user.click(tab(/^Confirmed/));
    await waitFor(() => expect(rows()).toHaveLength(25));
  });

  it("shows a retryable error instead of an empty list when loading fails", async () => {
    const user = userEvent.setup();
    listBookings.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: /Try again/ })).toBeTruthy();
    expect(screen.queryByText("No reservations yet")).toBeNull();

    await user.click(within(alert).getByRole("button", { name: /Try again/ }));
    await waitFor(() => expect(rows()).toHaveLength(11));
  });
});
