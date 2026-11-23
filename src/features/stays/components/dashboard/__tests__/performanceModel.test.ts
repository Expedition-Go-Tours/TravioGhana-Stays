import { describe, expect, it } from "vitest";
import type { DashboardPerformanceProperty } from "@/types/stays";
import {
  PERFORMANCE_COLUMN_KEYS,
  formatPercent,
  percentChange,
  performanceCsv,
  performanceCsvFilename,
  summarizePerformanceRows,
} from "../performanceModel";

const ROW: DashboardPerformanceProperty = {
  id: "p1",
  name: "Akwaaba Coast Hotel",
  city: "Accra",
  region: "Greater Accra",
  country: "Ghana",
  photo: null,
  bookedAvgDailyRate: 483.33,
  stayedAvgDailyRate: 900,
  cancellationRate: 25,
  stayedRoomNights: 1,
  stayedEarnings: 900,
  bookedRoomNights: 4,
  bookedEarnings: 2100,
  cancellations: 1,
  noShows: 0,
  avgBookingWindow: 2,
  avgLengthOfStay: 2,
  bookable: true,
  reviewScore: 9,
  reviewCount: 2,
  reservations: 3,
  clickThroughRate: null,
  conversionRate: null,
};

describe("performance helpers", () => {
  it("calculates percentage change and handles a zero baseline", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
  });

  it("recomputes the summary from the visible property rows", () => {
    const second = {
      ...ROW,
      id: "p2",
      bookedAvgDailyRate: 500,
      bookedRoomNights: 2,
      bookedEarnings: 1000,
      stayedRoomNights: 0,
      stayedEarnings: 0,
      reservations: 1,
      cancellations: 0,
      avgBookingWindow: 4,
      avgLengthOfStay: 2,
      bookable: false,
      reviewScore: null,
      reviewCount: 0,
    };
    expect(summarizePerformanceRows([ROW, second])).toEqual({
      bookedAvgDailyRate: 516.67,
      stayedAvgDailyRate: 900,
      cancellationRate: 20,
      stayedRoomNights: 1,
      stayedEarnings: 900,
      avgBookingWindow: 2.5,
      avgLengthOfStay: 2,
      openProperties: 1,
      totalProperties: 2,
    });
  });

  it("formats percentages and missing values", () => {
    expect(formatPercent(25)).toBe("25%");
    expect(formatPercent(12.34)).toBe("12.3%");
    expect(formatPercent(null)).toBe("—");
  });

  it("exports only the visible columns with friendly values", () => {
    const csv = performanceCsv(
      [ROW],
      ["id", "property", "bookedAvgDailyRate", "cancellationRate", "reviewScore", "clickThroughRate"],
      "USD",
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "ID,Property,Booked avg. daily rate,Cancellation rate,Review score,Click-through rate (30 days)",
    );
    expect(lines[1]).toBe("p1,Akwaaba Coast Hotel — Accra,$483.33,25%,9,Not tracked");
  });

  it("writes the no-review state and every column when asked", () => {
    const csv = performanceCsv(
      [{ ...ROW, reviewScore: null, reviewCount: 0 }],
      PERFORMANCE_COLUMN_KEYS,
      "USD",
    );
    expect(csv).toContain("No reviews for this period");
    expect(csv.split("\r\n")[0].split(",")).toHaveLength(PERFORMANCE_COLUMN_KEYS.length);
  });

  it("names the file by date", () => {
    expect(performanceCsvFilename(new Date(2026, 10, 23))).toBe("travio-performance-2026-11-23.csv");
  });
});
