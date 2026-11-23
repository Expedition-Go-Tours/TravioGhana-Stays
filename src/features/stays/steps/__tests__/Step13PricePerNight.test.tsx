/**
 * STEP 16 — Price per night: the competitive range, the nightly price with
 * the commission/earnings breakdown, and the 20% launch promotion.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Step13PricePerNight from "../Step13PricePerNight";

function renderStep({ overrides = {}, saving = false } = {}) {
  const patch = vi.fn();
  const onBack = vi.fn();
  const onNext = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <Step13PricePerNight
      property={{ pricePerNight: "29.00", currency: "USD", promotion: true, ...overrides }}
      patch={patch}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      saving={saving}
    />,
  );
  return { patch, onBack, onNext, onSave };
}

describe("Step13PricePerNight — price per night", () => {
  it("renders the range, the price field and the promotion", () => {
    renderStep();

    expect(screen.getByText("Price per night")).toBeTruthy();
    expect(screen.getByText("Median: $402.00")).toBeTruthy();
    expect(screen.getByText("$120.00")).toBeTruthy();
    expect(screen.getByText("$673.00")).toBeTruthy();

    expect(screen.getByLabelText("Price guests pay")).toBeTruthy();
    expect(screen.getByDisplayValue("29.00")).toBeTruthy();
    expect(screen.getByText(/Including taxes, commission and charges/)).toBeTruthy();
    expect(screen.getByText("$24.65")).toBeTruthy();
    expect(screen.getByText("All prices are shown and charged in USD.")).toBeTruthy();
    expect(screen.getAllByText("USD").length).toBeGreaterThan(0);
    expect(screen.getByText(/Your earnings \(including taxes\)/)).toBeTruthy();

    expect(
      screen.getByRole("checkbox", { name: /Get guests' attention with a 20% discount/ }).checked,
    ).toBe(true);
    expect(screen.getByText(/\$23\.20 per night/)).toBeTruthy();
  });

  it("keeps USD even when a stored property currency is different", () => {
    renderStep({ overrides: { currency: "EUR" } });

    expect(screen.getByText("Median: $402.00")).toBeTruthy();
    expect(screen.getByText("$24.65")).toBeTruthy();
    expect(screen.getByText(/\$23\.20 per night/)).toBeTruthy();
  });

  it("records a typed price and toggles the promotion", async () => {
    const user = userEvent.setup();
    const { patch } = renderStep();

    fireEvent.change(screen.getByLabelText("Price guests pay"), { target: { value: "35" } });
    expect(patch).toHaveBeenCalledWith({ pricePerNight: "35" });

    await user.click(screen.getByRole("checkbox", { name: /20% discount/ }));
    expect(patch).toHaveBeenCalledWith({ promotion: false });
  });

  it("dismisses the tips cards independently", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Dismiss price tips" }));
    expect(screen.queryByText("What if I'm not sure about my price?")).toBeNull();
    expect(screen.getByText("Rules for setting up a promotion")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dismiss promotion tips" }));
    expect(screen.queryByText("Rules for setting up a promotion")).toBeNull();
  });

  it("saves the draft before continuing and goes back", async () => {
    const user = userEvent.setup();
    const { onNext, onSave, onBack } = renderStep();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("Step13PricePerNight — currency default", () => {
  it("uses USD when the property has no currency yet, without a currency picker", () => {
    renderStep({ overrides: { currency: undefined } });
    expect(screen.getByText("Median: $402.00")).toBeTruthy();
    expect(screen.getByText("All prices are shown and charged in USD.")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
