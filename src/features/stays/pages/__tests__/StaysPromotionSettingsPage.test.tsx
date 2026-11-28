import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysPromotionSettingsPage from "../StaysPromotionSettingsPage";
import { staysMock } from "../../mock/store";
import type { PromotionDealKind } from "../../config/promotionDeals";

beforeEach(() => staysMock.reset());

function renderPage(kind: PromotionDealKind) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/stays/special-offers/${kind}`]}>
        <StaysPromotionSettingsPage kind={kind} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("promotion settings variants", () => {
  it("renders the Basic Deal without book window or length of stay", () => {
    renderPage("basic-deal");

    expect(screen.getByRole("heading", { level: 1, name: "Add a new promotion" })).toBeTruthy();
    expect(screen.getByText("Promotion settings")).toBeTruthy();
    expect(screen.getAllByText("Select properties").length).toBeGreaterThan(0);
    expect(screen.getByText("Check and confirm")).toBeTruthy();
    expect(screen.getByText("Audience")).toBeTruthy();
    expect(screen.getByLabelText("Discount percentage")).toHaveValue(10);
    expect(screen.getByLabelText("Promotion name")).toHaveValue("Basic Deal");
    expect(screen.queryByText("Book window")).toBeNull();
    expect(screen.queryByText("Length of stay")).toBeNull();
  });

  it("renders the Early Booker book window and length of stay", () => {
    renderPage("early-booker");

    expect(screen.getByText("Book window")).toBeTruthy();
    expect(screen.getByLabelText("Minimum days before check-in")).toHaveValue(30);
    expect(screen.getByText("Length of stay")).toBeTruthy();
    expect(screen.getByText("Match to rate plans")).toBeTruthy();
    expect(screen.getByLabelText("Promotion name")).toHaveValue("Early Booker Deal");
  });

  it("switches Last Minute between days and hours", async () => {
    const user = userEvent.setup();
    renderPage("last-minute");

    expect(screen.getByLabelText("Days maximum before check-in")).toHaveValue(3);
    expect(screen.getByLabelText("Hours maximum before check-in")).toBeDisabled();
    await user.click(screen.getByLabelText("Hours before check-in"));
    expect(screen.getByLabelText("Hours maximum before check-in")).toBeEnabled();
    expect(screen.getByLabelText("Days maximum before check-in")).toBeDisabled();
  });

  it("renders the Late Escape calendar, minimum discount and month controls", () => {
    renderPage("late-escape");

    expect(screen.getByRole("heading", { level: 2, name: "Late Escape Deal" })).toBeTruthy();
    expect(screen.getByText("From 3 Sept 2026 to 7 Jan 2027")).toBeTruthy();
    expect(screen.getByLabelText("Discount percentage")).toHaveValue(20);
    expect(screen.getAllByText("November 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("December 2026").length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: "October 2026" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "January 2027" })).toBeChecked();
    expect(screen.queryByText("Audience")).toBeNull();
    expect(screen.queryByText("Length of stay")).toBeNull();
  });
});

describe("length of stay editor", () => {
  it("saves a selected minimum stay", async () => {
    const user = userEvent.setup();
    renderPage("early-booker");

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Length of stay" })).toBeTruthy();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Select minimum length of stay" }));
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Length of stay" })).toBeNull(),
    );
    expect(screen.getByText("Minimum 2 nights")).toBeTruthy();
  });
});

describe("select properties step", () => {
  it("moves to the property search and enables confirmation after a match", async () => {
    const user = userEvent.setup();
    renderPage("basic-deal");

    await user.click(screen.getByRole("button", { name: "Select properties" }));
    expect(screen.getByRole("heading", { name: "Select properties to make changes to" })).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Paste or enter a name, location or multiple property IDs"),
    ).toBeTruthy();
    expect(screen.getByText("We couldn't find any properties that match your search")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check and confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear property search" })).toBeTruthy();

    await user.type(screen.getByLabelText("Search for properties"), "Akwaaba");
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Akwaaba Coast Hotel" })).toBeTruthy());
    await user.click(screen.getByRole("checkbox", { name: "Akwaaba Coast Hotel" }));
    expect(screen.getByRole("button", { name: "Check and confirm" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1, name: "Add a new promotion" })).toBeTruthy();
    expect(screen.getByText("Audience")).toBeTruthy();
  });

  it("reviews the chosen details and lets settings be edited", async () => {
    const user = userEvent.setup();
    renderPage("basic-deal");

    await user.click(screen.getByRole("button", { name: "Select properties" }));
    await user.type(screen.getByLabelText("Search for properties"), "Akwaaba");
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Akwaaba Coast Hotel" })).toBeTruthy());
    await user.click(screen.getByRole("checkbox", { name: "Akwaaba Coast Hotel" }));
    await user.click(screen.getByRole("button", { name: "Check and confirm" }));

    expect(screen.getByRole("heading", { name: "Check and confirm" })).toBeTruthy();
    expect(screen.getByText("Everyone")).toBeTruthy();
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText("Basic Deal")).toBeTruthy();
    expect(screen.getByText("Akwaaba Coast Hotel")).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByRole("heading", { name: "Audience" })).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: /Members and newsletter subscribers only/ }));
    await user.click(screen.getByRole("button", { name: "Select properties" }));
    await user.click(screen.getByRole("button", { name: "Check and confirm" }));

    expect(
      screen.getByText("Members and newsletter subscribers only (Secret deal)"),
    ).toBeTruthy();
  });
});
