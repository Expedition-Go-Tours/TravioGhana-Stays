import { describe, expect, it } from "vitest";
import { applyCopyAdjustment, copyDatePairs } from "../copyRates";

describe("copyDatePairs", () => {
  it("pairs the first Monday in the source range with the first Monday next year", () => {
    const pairs = copyDatePairs({
      from: "2026-01-01",
      to: "2026-01-07",
      targetFrom: "2027-01-01",
      targetTo: "2027-01-07",
      weekdays: [1],
    });

    expect(pairs).toEqual([{ source: "2026-01-05", target: "2027-01-04" }]);
  });

  it("keeps the old sequential mapping when weekdays are omitted", () => {
    const pairs = copyDatePairs({
      from: "2026-10-01",
      to: "2026-10-02",
      targetFrom: "2026-11-01",
    });

    expect(pairs).toEqual([
      { source: "2026-10-01", target: "2026-11-01" },
      { source: "2026-10-02", target: "2026-11-02" },
    ]);
  });
});

describe("applyCopyAdjustment", () => {
  it("applies percentage and fixed increases and decreases", () => {
    expect(applyCopyAdjustment(200, { direction: "increase", unit: "percent", value: 10 })).toBe(220);
    expect(applyCopyAdjustment(200, { direction: "decrease", unit: "amount", value: 50 })).toBe(150);
    expect(applyCopyAdjustment(200, { direction: "decrease", unit: "percent", value: 150 })).toBe(0);
    expect(applyCopyAdjustment(200, null)).toBe(200);
  });
});
