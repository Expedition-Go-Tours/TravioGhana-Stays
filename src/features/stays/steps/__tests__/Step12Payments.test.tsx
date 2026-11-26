/**
 * The payments & invoicing step patches the payment mode and the invoicing
 * details; the invoice address only appears when it differs from the property.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Step12Payments from "../Step12Payments";
import { PAYMENT_MODES } from "../../config/constants";

describe("Step12Payments", () => {
  it("offers online payment as the only payment mode", () => {
    render(<Step12Payments property={{}} patch={() => {}} />);

    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(screen.getByLabelText(PAYMENT_MODES[0])).toBeChecked();
    expect(screen.queryByText("By card or mobile money at the property")).toBeNull();
  });

  it("falls back to online for drafts saved with the removed mode", () => {
    render(
      <Step12Payments
        property={{ payments: { mode: "By card or mobile money at the property" } }}
        patch={() => {}}
      />,
    );

    expect(screen.getByLabelText(PAYMENT_MODES[0])).toBeChecked();
    expect(screen.queryByText("By card or mobile money at the property")).toBeNull();
  });

  it("reveals the invoice address when it differs from the property", () => {
    render(
      <Step12Payments
        property={{ invoicing: { name: "A", legalName: "", sameAddress: false, address: "Accra" } }}
        patch={() => {}}
      />,
    );
    expect(screen.getByDisplayValue("Accra")).toBeTruthy();
  });

  it("hides the invoice address when it matches the property", () => {
    render(
      <Step12Payments
        property={{ invoicing: { name: "A", legalName: "", sameAddress: true, address: "" } }}
        patch={() => {}}
      />,
    );
    expect(screen.queryByLabelText("Invoice address")).toBeNull();
  });
});
