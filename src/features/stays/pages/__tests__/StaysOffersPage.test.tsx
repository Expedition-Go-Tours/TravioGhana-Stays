/**
 * Special Offers — the promotion catalogue landing page.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import StaysOffersPage from "../StaysOffersPage";
import StaysPropertyDealPage from "../StaysPropertyDealPage";
import { PROMOTIONS } from "../../config/promotions";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/stays/special-offers"]}>
      <LocationProbe />
      <Routes>
        <Route path="/stays/special-offers" element={<StaysOffersPage />} />
        <Route path="/stays/special-offers/property-deal" element={<StaysPropertyDealPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StaysOffersPage — promotion catalogue", () => {
  it("renders every promotion card, its badge and its metadata", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Special Offers" })).toBeTruthy();

    for (const promotion of PROMOTIONS) {
      expect(screen.getByRole("heading", { level: 2, name: promotion.title })).toBeTruthy();
    }

    expect(screen.getAllByText("New")).toHaveLength(2);
    expect(screen.getByText(/From 19 Nov 2026 to 2 Dec 2026/)).toBeTruthy();
    expect(screen.getByText(/minimum 30%/)).toBeTruthy();
    expect(screen.getByText(/From 3 Sept 2026 to 7 Jan 2027/)).toBeTruthy();
    expect(screen.getAllByText(/minimum 15%/)).toHaveLength(2);
  });

  it("shows one Take action per promotion", () => {
    renderPage();

    expect(screen.getAllByRole("button", { name: "Take action" })).toHaveLength(
      PROMOTIONS.filter((promotion) => !promotion.to).length,
    );
    expect(screen.getAllByRole("link", { name: "Take action" })).toHaveLength(
      PROMOTIONS.filter((promotion) => promotion.to).length,
    );
    expect(screen.queryByRole("button", { name: "Remove in bulk" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Create Offer/ })).toBeNull();
  });

  it("opens the New Property Deal flow from its Take action", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole("link", { name: "Take action" })[0]);
    expect(screen.getByTestId("location").textContent).toBe("/stays/special-offers/property-deal");
    expect(screen.getByRole("heading", { level: 1, name: "Create a New Property Deal" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Settings" })).toBeTruthy();
    expect(screen.getByText("The first 3 bookings during the first 90 days will get a 20% discount")).toBeTruthy();
  });

  it("leaves the other Take action buttons inert until their pages exist", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole("button", { name: "Take action" })[1]);
    expect(screen.getByTestId("location").textContent).toBe("/stays/special-offers");
  });
});
