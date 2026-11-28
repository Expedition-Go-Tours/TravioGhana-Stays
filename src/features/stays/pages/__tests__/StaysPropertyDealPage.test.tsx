import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import StaysPropertyDealPage from "../StaysPropertyDealPage";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/stays/special-offers/property-deal"]}>
        <StaysPropertyDealPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StaysPropertyDealPage", () => {
  it("edits the deal name and discount", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Deal name" }));
    expect(screen.getByRole("heading", { name: "Deal name" })).toBeTruthy();
    const name = screen.getByRole("textbox", { name: "Deal name" });
    await user.clear(name);
    await user.type(name, "Autumn Launch");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Autumn Launch")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit Discount percentage" }));
    const discount = screen.getByRole("spinbutton", { name: "Discount percentage" });
    await user.clear(discount);
    await user.type(discount, "25");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("25%")).toBeTruthy();
    expect(
      screen.getByText("The first 3 bookings during the first 90 days will get a 25% discount"),
    ).toBeTruthy();
  });

  it("edits the booking limit, scope and length-of-stay rule", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Number of bookings" }));
    const bookings = screen.getByRole("spinbutton", { name: "Number of bookings" });
    const windowDays = screen.getByRole("spinbutton", { name: "Within the first (days)" });
    await user.clear(bookings);
    await user.type(bookings, "5");
    await user.clear(windowDays);
    await user.type(windowDays, "60");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      screen.getByText("The first 5 bookings during the first 60 days will get a 20% discount"),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit Rooms this discount applies to" }));
    await user.click(screen.getByRole("radio", { name: /Specific rooms/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Specific rooms (choose in Select properties)")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit How long guests need to stay" }));
    await user.click(screen.getByRole("radio", { name: "Select minimum length of stay" }));
    const nights = screen.getByRole("spinbutton", { name: "Minimum nights" });
    await user.clear(nights);
    await user.type(nights, "3");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Minimum 3 nights")).toBeTruthy();
  });

  it("uses the edited values in the final review", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Deal name" }));
    const name = screen.getByRole("textbox", { name: "Deal name" });
    await user.clear(name);
    await user.type(name, "Winter Launch");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await user.click(screen.getByRole("button", { name: "Select properties" }));
    await user.type(screen.getByLabelText("Search for properties"), "Akwaaba");
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Akwaaba Coast Hotel" })).toBeTruthy());
    await user.click(screen.getByRole("checkbox", { name: "Akwaaba Coast Hotel" }));
    await user.click(screen.getByRole("button", { name: "Check and confirm" }));

    expect(screen.getByRole("heading", { name: "Check and confirm" })).toBeTruthy();
    expect(screen.getByText("Winter Launch")).toBeTruthy();
    expect(screen.getByText("Akwaaba Coast Hotel")).toBeTruthy();
  });
});
