/**
 * Rates catalogue: the seven templates, their accordion steps, and creating a
 * plan only after Review.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import StaysRatesPage from "../StaysRatesPage";
import { staysMock } from "../../mock/store";

function renderPage(initial = "/stays/rates") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/stays/rates" element={<StaysRatesPage />} />
          <Route path="/stays/availability" element={<div>Availability</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  staysMock.reset();
  vi.clearAllMocks();
});

describe("StaysRatesPage — template catalogue", () => {
  it("shows the seven templates in their three groups", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Add a new rate plan" })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Increase bookings and reduce cancellations" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Attract a wider range of guests" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Custom plan" })).toBeTruthy();
    for (const name of ["Flexible", "Firm", "Non-refundable", "Weekly", "Monthly", "Early booker", "Custom"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeTruthy();
    }
    expect(screen.getAllByRole("button", { name: "Add rate plan" })).toHaveLength(7);
  });

  it("opens one accordion at a time and exposes template-specific steps", async () => {
    const user = userEvent.setup();
    renderPage();
    const add = () => screen.findAllByRole("button", { name: "Add rate plan" });

    await user.click((await add())[0]);
    expect(screen.getByRole("heading", { name: "Add flexible rate plan" })).toBeTruthy();
    expect(screen.getByLabelText("Cancellation policy")).toHaveTextContent("Flexible - 1 day");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click((await add())[3]);
    expect(await screen.findByText(/7 night minimum stay/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click((await add())[4]);
    expect(await screen.findByText(/28 night minimum stay/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click((await add())[5]);
    const earlyPanel = document.getElementById("rate-wizard-early-booker") as HTMLElement;
    expect(await within(earlyPanel).findByLabelText("Days before check-in")).toHaveValue(15);
    expect(within(earlyPanel).getByLabelText("Rate plan name")).toHaveValue("Early booker rate plan (15+ days)");
  });

  it("switches to the current rate plans management view", async () => {
    renderPage("/stays/rates?tab=current");
    expect(await screen.findByRole("heading", { level: 1, name: "Current rate plans" })).toBeTruthy();
    expect(await screen.findByText("Standard rate")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a rate plan" })).toBeTruthy();
  });

  it("creates a flexible plan from the review step", async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(staysMock, "saveRatePlan");
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Add rate plan" }))[0]);
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("heading", { name: "Review your flexible rate plan" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create rate plan" }));

    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
    const [propertyId, plan] = saveSpy.mock.calls[0];
    expect(propertyId).toBe("p1");
    expect(plan).toMatchObject({
      roomId: "r1",
      name: "Fully flexible",
      templateKey: "flexible",
      pricingModel: "Derived from room base rate",
      basePlanId: "plan-r1",
      adjustmentPct: 10,
      minStay: 1,
      cancellation: "Free cancellation",
      freeCancellationHours: 24,
      meal: "Room only",
    });
    expect(plan.id).toBeUndefined();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Rate plan created"));
  });

  it("maps non-refundable and weekly defaults into the created plans", async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(staysMock, "saveRatePlan");
    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Add rate plan" }))[2]);
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Create rate plan" }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
    expect(saveSpy.mock.calls[0][1]).toMatchObject({
      templateKey: "non-refundable",
      name: "Non-refundable",
      adjustmentPct: -10,
      cancellation: "Non-refundable",
    });
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Review your non-refundable/ })).toBeNull());

    await user.click((await screen.findAllByRole("button", { name: "Add rate plan" }))[3]);
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Create rate plan" }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(2));
    expect(saveSpy.mock.calls[1][1]).toMatchObject({
      templateKey: "weekly",
      name: "Weekly rate",
      minStay: 7,
      adjustmentPct: -15,
    });
  });
});
