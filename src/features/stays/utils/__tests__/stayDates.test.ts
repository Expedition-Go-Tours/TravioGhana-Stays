import { describe, expect, it } from "vitest";
import { formatStayRange, nightsBetween, nightsLabel, parseISODate } from "../stayDates";

// Intl separates ranges with thin spaces around the dash in newer ICU builds.
const normalize = (value: string) => value.replace(/[\u2009\u202f]/g, " ");

describe("stay dates", () => {
  it("parses calendar dates as local days, not UTC midnight", () => {
    const date = parseISODate("2026-10-04");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(4);
    expect(parseISODate("not a date")).toBeNull();
    expect(parseISODate(undefined)).toBeNull();
  });

  it("counts nights", () => {
    expect(nightsBetween("2026-10-04", "2026-10-08")).toBe(4);
    // Crosses the US daylight-saving change on Nov 1.
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(nightsBetween("2026-10-04", "bad")).toBeNull();
    expect(nightsLabel(1)).toBe("1 night");
    expect(nightsLabel(3)).toBe("3 nights");
    expect(nightsLabel(null)).toBeNull();
  });

  it("formats ranges in en-US style", () => {
    expect(normalize(formatStayRange("2026-10-04", "2026-10-08"))).toBe("Oct 4 – 8");
    expect(normalize(formatStayRange("2026-10-30", "2026-11-02"))).toBe("Oct 30 – Nov 2");
    expect(normalize(formatStayRange("2026-12-30", "2027-01-02"))).toBe("Dec 30, 2026 – Jan 2, 2027");
    expect(formatStayRange("soon", "later")).toBe("soon – later");
    expect(formatStayRange(null, null)).toBe("—");
  });
});
