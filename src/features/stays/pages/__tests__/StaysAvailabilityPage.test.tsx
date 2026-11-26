/**
 * Availability workspace: the section shell and the bulk room tools. The
 * calendar's own cell editing is covered by its components; here we pin the
 * new sub-pages.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import StaysAvailabilityPage from "../StaysAvailabilityPage";
import { shiftISODays, todayISO } from "../../utils/dates";
import { staysMock } from "../../mock/store";

function renderPage(section = "calendar", view?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const params = new URLSearchParams({ section });
  if (view) params.set("view", view);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/stays/availability?${params.toString()}`]}>
        <Routes>
          <Route path="/stays/availability" element={<StaysAvailabilityPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  staysMock.reset();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StaysAvailabilityPage — section shell", () => {
  it("renders the calendar by default and switches to every section", async () => {
    const { unmount } = renderPage("calendar");
    expect(await screen.findByRole("heading", { level: 1, name: "Calendar" })).toBeTruthy();
    unmount();

    for (const [section, title, text] of [
      ["open-close-rooms", "Open/close rooms", "Which dates do you want to make changes to?"],
      ["copy-rates", "Copy rates to future dates", "Which dates would you like to copy rates from?"],
      [
        "restrictions",
        "Dynamic restriction rules",
        "Fill more empty nights with bookings that suit your needs",
      ],
      ["pricing-per-guest", "Pricing per guest", "Standard rate"],
      ["child-rates", "Child rates", "Default child rates"],
    ] as const) {
      const view = renderPage(section);
      expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
      expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
      view.unmount();
    }
  });

  it("falls back to the calendar for removed value-add links", async () => {
    renderPage("value-adds");
    expect(await screen.findByRole("heading", { level: 1, name: "Calendar" })).toBeTruthy();
    expect(screen.queryByText("No value adds yet")).toBeNull();
  });
});

describe("Availability bulk tools", () => {
  it("switches between Monthly and Yearly calendar views", async () => {
    const user = userEvent.setup();
    renderPage("calendar");

    expect(await screen.findByRole("heading", { level: 2 })).toHaveTextContent(/\w+ \d{4}/);
    expect(screen.getByRole("combobox", { name: "Calendar view" })).toHaveTextContent("Monthly view");
    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage calendar settings" })).toBeTruthy();

    await user.click(screen.getByRole("combobox", { name: "Calendar view" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Monthly view",
      "Yearly view",
    ]);
    expect(screen.queryByRole("option", { name: "List view" })).toBeNull();
    await user.click(await screen.findByRole("option", { name: "Yearly view" }));
    expect(screen.getByRole("combobox", { name: "Calendar range" })).toHaveTextContent("Next 12 months");
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(12));
    expect(screen.getByRole("tab", { name: "Bookable dates" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Sold out dates" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage calendar settings" })).toBeTruthy();

    await user.click(screen.getByRole("combobox", { name: "Calendar view" }));
    await user.click(await screen.findByRole("option", { name: "Monthly view" }));
    expect(screen.getByRole("combobox", { name: "Calendar view" })).toHaveTextContent("Monthly view");
  });

  it("falls back to Monthly view for old list-view links", async () => {
    renderPage("calendar", "list");
    expect(await screen.findByRole("combobox", { name: "Calendar view" })).toHaveTextContent("Monthly view");
    expect(screen.queryByRole("rowheader", { name: "Room status" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Bulk edit" })).toBeNull();
  });

  it("saves closed status for the selected room and weekday range", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(staysMock, "setAvailabilityRange");
    const from = todayISO();
    const to = shiftISODays(from, 30);
    renderPage("open-close-rooms");

    expect(await screen.findByText("Which dates do you want to make changes to?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Entire room" }));
    await user.click(screen.getByRole("radio", { name: "Closed" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          roomIds: ["r1"],
          from,
          to,
          weekdays: [1, 2, 3, 4, 5, 6, 0],
          values: { closed: true },
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/room-date.*closed/)),
    );
  });

  it("reviews and copies the chosen rate plans to next year", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(staysMock, "copyAvailabilityRange");
    const year = new Date().getFullYear();
    renderPage("copy-rates");

    expect(await screen.findByRole("heading", { name: "Which dates would you like to copy rates from?" })).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Select all rate plans for all room types" }));
    await user.click(screen.getByRole("button", { name: "Review" }));

    expect(screen.getByRole("heading", { name: "Review your copy" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Copy rates" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          roomIds: ["r1"],
          from: `${year}-01-01`,
          to: `${year}-12-31`,
          targetFrom: `${year + 1}-01-01`,
          targetTo: `${year + 1}-12-31`,
          weekdays: [1, 2, 3, 4, 5, 6, 0],
          fields: { price: true, count: true },
          adjustment: null,
          overwrite: true,
        }),
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/copied to/)));
  });
});

describe("Availability rules", () => {
  it("saves an unsold nights rule on the property", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(staysMock, "updateProperty");
    renderPage("restrictions");

    expect(await screen.findByText("Fill more empty nights with bookings that suit your needs")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(screen.getByRole("heading", { name: "Review your unsold nights rule" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save rule" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, patch] = spy.mock.calls.at(-1)!;
    expect(patch.dynamicRestrictions).toMatchObject({
      unsold: {
        minStay: 1,
        minAdvanceDays: null,
        applicablePeriodDays: 60,
        endMode: "until-off",
        priceChange: { mode: "none", unit: "percent", value: 0 },
        scope: { allRooms: true, allRatePlans: true, roomIds: [], ratePlanIds: [] },
      },
    });
  });

  it("switches to the gap nights rule and saves it", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(staysMock, "updateProperty");
    renderPage("restrictions");

    await user.click(await screen.findByRole("button", { name: "Gap nights" }));
    expect(screen.getByRole("heading", { name: "Create a rule for gap nights" })).toBeTruthy();
    expect(screen.queryByLabelText("Minimum advance reservation")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue to review" }));
    await user.click(screen.getByRole("button", { name: "Save rule" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, patch] = spy.mock.calls.at(-1)!;
    expect(patch.dynamicRestrictions.gap).toMatchObject({ minStay: 1, applicablePeriodDays: 60 });
  });
});

describe("Pricing per guest", () => {
  it("opens a plan, changes base occupancy and saves occupancy pricing", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(staysMock, "saveRatePlan");
    renderPage("pricing-per-guest");

    expect(await screen.findByRole("heading", { level: 2, name: "Deluxe King Room" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Selected property" })).toBeNull();
    expect(screen.getByRole("button", { name: "Yes, this page is helpful" })).toBeTruthy();
    const planButton = screen.getByRole("button", { name: /Standard rate/ });
    expect(planButton).toHaveAttribute("aria-expanded", "false");
    await user.click(planButton);
    expect(screen.getByText("Set prices per guest")).toBeTruthy();

    const base = screen.getByLabelText("Base occupancy");
    await user.clear(base);
    await user.type(base, "4");
    expect(screen.getByLabelText("Reduction for 1 guest")).toBeTruthy();
    expect(screen.getByLabelText("Reduction for 2 guests")).toBeTruthy();

    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, plan] = spy.mock.calls.at(-1)!;
    expect(plan).toMatchObject({
      roomId: "r1",
      baseGuests: 4,
      occupancyPricingMode: "custom",
      maxGuests: 4,
    });
    expect(plan.occupancyDiscounts).toHaveLength(3);
  });

  it("keeps multiple plan accordions open at the same time", async () => {
    const user = userEvent.setup();
    await staysMock.saveRatePlan("p1", {
      id: "plan-extra",
      roomId: "r1",
      name: "Non-refundable Rate",
      baseGuests: 2,
      maxGuests: 2,
      occupancyPricingMode: "custom",
      occupancyDiscounts: [],
      singleGuestDiscount: 0,
    } as never);
    renderPage("pricing-per-guest");

    const standard = await screen.findByRole("button", { name: /Standard rate/ });
    const nonRefundable = screen.getByRole("button", { name: /Non-refundable Rate/ });
    await user.click(standard);
    await user.click(nonRefundable);

    expect(standard).toHaveAttribute("aria-expanded", "true");
    expect(nonRefundable).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Set prices per guest")).toHaveLength(2);
  });
});

describe("Child rates", () => {
  it("edits age groups in the modal and saves the default rates", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(staysMock, "updateProperty");
    renderPage("child-rates");

    expect(await screen.findByRole("heading", { name: "Default child rates" })).toBeTruthy();
    expect(screen.getByText(/Infants/)).toBeTruthy();
    expect(screen.getByText(/Children/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit age groups and rates" }));

    expect(screen.getByRole("heading", { name: "Edit age groups and rates" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Add age group" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, patch] = spy.mock.calls.at(-1)!;
    expect(patch.childRateGroups).toHaveLength(3);
    expect(patch.childRateGroups[0]).toMatchObject({ label: "Infants", minAge: 0, maxAge: 2 });
    expect(patch.childRateGroups[1]).toMatchObject({ minAge: 3 });
    expect(patch.childRateGroups[2]).toMatchObject({ maxAge: 17 });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit age groups and rates" })).toBeNull(),
    );
  });

  it("only changes the age group whose slider handle is moved", async () => {
    const user = userEvent.setup();
    renderPage("child-rates");

    await user.click(await screen.findByRole("button", { name: "Edit age groups and rates" }));
    await user.click(screen.getByRole("button", { name: "Add age group" }));

    const minimums = screen.getAllByRole("slider", { name: "Children minimum age" });
    expect(minimums).toHaveLength(2);
    fireEvent.keyDown(minimums[1], { key: "ArrowRight" });

    expect(screen.getByText("(3–10 years)")).toBeTruthy();
    expect(screen.getByText("(12–17 years)")).toBeTruthy();
    expect(screen.getByText(/without gaps or overlaps/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });
});
