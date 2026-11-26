import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";

import { Field } from "@/components/ui/field";
import DatePicker from "../DatePicker";

function dayInCurrentMonth(day: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day);
}

describe("DatePicker", () => {
  it("shows the stored ISO date as dd/MM/yyyy", () => {
    render(<Field label="Check-in"><DatePicker value="2026-10-04" /></Field>);

    const trigger = screen.getByLabelText("Check-in");
    expect(trigger).toHaveTextContent("04/10/2026");
  });

  it("opens the calendar and emits an ISO date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const target = dayInCurrentMonth(new Date().getDate() === 15 ? 16 : 15);

    render(<Field label="Check-in"><DatePicker value="" onChange={onChange} /></Field>);
    await user.click(screen.getByLabelText("Check-in"));

    const calendar = screen.getByRole("dialog", { name: "Choose date" });
    await user.click(within(calendar).getByRole("button", { name: format(target, "PPPP") }));

    expect(onChange).toHaveBeenCalledWith(format(target, "yyyy-MM-dd"));
    expect(screen.queryByRole("dialog", { name: "Choose date" })).toBeNull();
  });

  it("disables days outside the allowed range", async () => {
    const user = userEvent.setup();
    const min = dayInCurrentMonth(10);
    const max = dayInCurrentMonth(20);

    render(
      <DatePicker
        value={format(min, "yyyy-MM-dd")}
        minDate={format(min, "yyyy-MM-dd")}
        maxDate={format(max, "yyyy-MM-dd")}
        aria-label="Expiry date"
      />,
    );
    await user.click(screen.getByLabelText("Expiry date"));

    const calendar = screen.getByRole("dialog", { name: "Choose date" });
    expect(
      within(calendar).getByRole("button", { name: new RegExp(format(dayInCurrentMonth(9), "PPPP")) }),
    ).toBeDisabled();
    expect(
      within(calendar).getByRole("button", { name: new RegExp(format(dayInCurrentMonth(21), "PPPP")) }),
    ).toBeDisabled();
  });

  it("wires error and disabled states to the trigger", () => {
    const { rerender } = render(
      <Field label="Check-in" error="Choose a date.">
        <DatePicker value="" error />
      </Field>,
    );

    expect(screen.getByLabelText("Check-in")).toHaveAttribute("aria-invalid", "true");

    rerender(
      <Field label="Check-in">
        <DatePicker value="" disabled />
      </Field>,
    );
    expect(screen.getByLabelText("Check-in")).toBeDisabled();
  });
});
