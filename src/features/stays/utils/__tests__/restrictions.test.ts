import { describe, expect, it } from "vitest";
import { applyRestrictionRules, ruleApplies } from "../restrictions";
import type { RestrictionRule } from "@/types/stays";

const RULE: RestrictionRule = {
  id: "rule-1",
  name: "Weekend minimum",
  roomIds: ["r1"],
  from: "2026-10-01",
  to: "2026-10-31",
  weekdays: [5, 6],
  minStay: 2,
  maxStay: 4,
  closed: false,
  closedArrival: false,
  closedDeparture: false,
  active: true,
};

describe("restriction rules", () => {
  it("matches by room, date range, weekday and active state", () => {
    expect(ruleApplies(RULE, "r1", "2026-10-03")).toBe(true); // Saturday
    expect(ruleApplies(RULE, "r1", "2026-10-01")).toBe(false); // Thursday is not selected
    expect(ruleApplies(RULE, "r2", "2026-10-03")).toBe(false);
    expect(ruleApplies(RULE, "r1", "2026-11-06")).toBe(false); // outside range
    expect(ruleApplies({ ...RULE, active: false }, "r1", "2026-10-03")).toBe(false);
    expect(ruleApplies({ ...RULE, weekdays: [] }, "r1", "2026-10-01")).toBe(true);
  });

  it("merges matching rules over stored prices and marks blocked dates", () => {
    const overrides = {
      "r1|2026-10-03": { price: 900, count: 2 },
      "r1|2026-10-04": { price: 800 },
    };
    const merged = applyRestrictionRules({ id: "r1" }, ["2026-10-03", "2026-10-04"], overrides, [
      RULE,
      { ...RULE, id: "rule-2", weekdays: [], closed: true },
    ]);

    expect(merged["r1|2026-10-03"]).toMatchObject({
      price: 900,
      count: 2,
      minStay: 2,
      maxStay: 4,
      closed: true,
    });
    expect(merged["r1|2026-10-04"]).toMatchObject({ price: 800, closed: true });
  });
});
