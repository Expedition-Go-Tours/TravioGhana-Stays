import { describe, expect, it } from "vitest";
import { defaultPlanForRoom, planPrice } from "../ratePlans";

const ROOM = {
  id: "r1",
  name: "Deluxe",
  kind: "Room",
  count: 2,
  price: 750,
  weekend: 850,
  adults: 2,
  children: 0,
};

describe("planPrice", () => {
  it("uses a fixed plan's own price", () => {
    expect(planPrice({ ...defaultPlanForRoom(ROOM), id: "base", price: 500 }, ROOM)).toBe(500);
  });

  it("applies the adjustment to the room base when no base plan is set", () => {
    expect(
      planPrice({ id: "derived", pricingModel: "Derived from room base rate", adjustmentPct: 10 }, ROOM),
    ).toBe(825);
  });

  it("derives from another plan and follows a chain", () => {
    const base = { ...defaultPlanForRoom(ROOM), id: "base", pricingModel: "Fixed nightly rate", price: 600 };
    const middle = {
      ...defaultPlanForRoom(ROOM),
      id: "middle",
      pricingModel: "Derived from room base rate",
      basePlanId: "base",
      adjustmentPct: -10,
    };
    const child = {
      ...defaultPlanForRoom(ROOM),
      id: "child",
      pricingModel: "Derived from room base rate",
      basePlanId: "middle",
      adjustmentPct: 20,
    };
    expect(planPrice(child, ROOM, [base, middle, child])).toBe(648);
  });

  it("falls back to the room price on a broken or cyclic base", () => {
    const a = {
      ...defaultPlanForRoom(ROOM),
      id: "a",
      pricingModel: "Derived from room base rate",
      basePlanId: "b",
      adjustmentPct: 0,
    };
    const b = {
      ...defaultPlanForRoom(ROOM),
      id: "b",
      pricingModel: "Derived from room base rate",
      basePlanId: "a",
      adjustmentPct: 0,
    };
    expect(planPrice(a, ROOM, [a, b])).toBe(750);
  });
});
