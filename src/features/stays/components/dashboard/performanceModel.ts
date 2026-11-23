import type {
  DashboardPerformance,
  DashboardPerformanceComparison,
  DashboardPerformanceMetrics,
  DashboardPerformancePeriod,
  DashboardPerformanceProperty,
  DashboardPropertyRow,
} from "@/types/stays";
import { formatMoney } from "@/lib/money";
import { toCsv } from "./dashboardModel";

export const PERFORMANCE_PERIOD_OPTIONS: { value: DashboardPerformancePeriod; label: string }[] = [
  { value: "month-to-date", label: "Month-to-date" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-90-days", label: "Last 90 days" },
  { value: "year-to-date", label: "Year-to-date" },
];

export const PERFORMANCE_COMPARISON_OPTIONS: { value: DashboardPerformanceComparison; label: string }[] = [
  { value: "none", label: "No comparison" },
  { value: "previous-period", label: "Previous period" },
  { value: "previous-year", label: "Previous year" },
];

export type PerformanceColumnKey =
  | "id"
  | "property"
  | "bookedAvgDailyRate"
  | "stayedAvgDailyRate"
  | "cancellationRate"
  | "stayedRoomNights"
  | "stayedEarnings"
  | "reviewScore"
  | "reservations"
  | "clickThroughRate"
  | "conversionRate";

export type PerformanceColumn = {
  key: PerformanceColumnKey;
  label: string;
  mandatory?: boolean;
};

export const PERFORMANCE_COLUMNS: PerformanceColumn[] = [
  { key: "id", label: "ID", mandatory: true },
  { key: "property", label: "Property", mandatory: true },
  { key: "bookedAvgDailyRate", label: "Booked avg. daily rate" },
  { key: "stayedAvgDailyRate", label: "Stayed avg. daily rate" },
  { key: "cancellationRate", label: "Cancellation rate" },
  { key: "stayedRoomNights", label: "Stayed room nights" },
  { key: "stayedEarnings", label: "Stayed earnings" },
  { key: "reviewScore", label: "Review score" },
  { key: "reservations", label: "Reservations" },
  { key: "clickThroughRate", label: "Click-through rate (30 days)" },
  { key: "conversionRate", label: "Conversion (30 days)" },
];

export const PERFORMANCE_COLUMN_KEYS = PERFORMANCE_COLUMNS.map((column) => column.key);

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || !Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Aggregate the visible property rows into the summary card. Recomputing it
 * keeps the eight figures in step with the shared location/search filter.
 */
export function summarizePerformanceRows(rows: DashboardPerformanceProperty[]): DashboardPerformanceMetrics {
  const sum = (read: (row: DashboardPerformanceProperty) => number) =>
    rows.reduce((total, row) => total + read(row), 0);

  const bookedRoomNights = sum((row) => row.bookedRoomNights);
  const bookedEarnings = sum((row) => row.bookedEarnings);
  const stayedRoomNights = sum((row) => row.stayedRoomNights);
  const stayedEarnings = sum((row) => row.stayedEarnings);
  const reservations = sum((row) => row.reservations);
  const cancellations = sum((row) => row.cancellations);
  const noShows = sum((row) => row.noShows);
  const totalReservations = reservations + cancellations + noShows;

  return {
    bookedAvgDailyRate: bookedRoomNights ? round(bookedEarnings / bookedRoomNights, 2) : 0,
    stayedAvgDailyRate: stayedRoomNights ? round(stayedEarnings / stayedRoomNights, 2) : 0,
    cancellationRate: totalReservations ? round((cancellations / totalReservations) * 100, 1) : 0,
    stayedRoomNights,
    stayedEarnings: round(stayedEarnings, 2),
    avgBookingWindow: reservations
      ? round(rows.reduce((total, row) => total + row.avgBookingWindow * row.reservations, 0) / reservations, 1)
      : 0,
    avgLengthOfStay: reservations
      ? round(rows.reduce((total, row) => total + row.avgLengthOfStay * row.reservations, 0) / reservations, 1)
      : 0,
    openProperties: rows.filter((row) => row.bookable).length,
    totalProperties: rows.length,
  };
}

function performanceValue(
  row: DashboardPerformanceProperty,
  key: PerformanceColumnKey,
): string | number {
  if (key === "property") return `${row.name} — ${row.city}`;
  if (key === "reviewScore") {
    return row.reviewScore == null ? "No reviews for this period" : formatDecimal(row.reviewScore, 1);
  }
  if (key === "bookedAvgDailyRate" || key === "stayedAvgDailyRate" || key === "stayedEarnings") {
    return formatMoney(row[key], "USD");
  }
  if (key === "cancellationRate") return formatPercent(row.cancellationRate);
  if (key === "clickThroughRate" || key === "conversionRate") {
    return row[key] == null ? "Not tracked" : formatPercent(row[key]);
  }
  return row[key];
}

export function performanceCsv(
  rows: DashboardPerformanceProperty[],
  visibleColumns: PerformanceColumnKey[],
  _currency?: string,
): string {
  const columns = PERFORMANCE_COLUMNS.filter((column) => visibleColumns.includes(column.key));
  return toCsv(
    columns.map((column) => column.label),
    rows.map((row) => columns.map((column) => performanceValue(row, column.key))),
  );
}

export function performanceCsvFilename(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `travio-performance-${stamp}.csv`;
}

/**
 * A complete, zero-filled Performance payload used when the live dashboard
 * endpoint has not shipped the optional `performance` block yet. The tab still
 * renders its real layout, property rows and period labels instead of an
 * "unavailable" state.
 */
export function fallbackPerformance(
  data: { cancellation?: { rate?: number } } | undefined,
  rows: DashboardPropertyRow[],
  period: DashboardPerformancePeriod,
  comparison: DashboardPerformanceComparison,
): DashboardPerformance {
  const periodLabel = PERFORMANCE_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "Month-to-date";
  const comparisonLabel =
    PERFORMANCE_COMPARISON_OPTIONS.find((option) => option.value === comparison)?.label ?? "No comparison";

  const properties: DashboardPerformanceProperty[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    region: row.region,
    country: row.country,
    photo: row.photo,
    bookedAvgDailyRate: 0,
    stayedAvgDailyRate: 0,
    cancellationRate: 0,
    stayedRoomNights: 0,
    stayedEarnings: 0,
    bookedRoomNights: 0,
    bookedEarnings: 0,
    cancellations: 0,
    noShows: 0,
    avgBookingWindow: 0,
    avgLengthOfStay: 0,
    bookable: row.status === "Live",
    reviewScore: null,
    reviewCount: 0,
    reservations: 0,
    clickThroughRate: null,
    conversionRate: null,
  }));

  return {
    period: { key: period, label: periodLabel, from: "", to: "" },
    comparison: { key: comparison, label: comparisonLabel },
    summary: {
      bookedAvgDailyRate: 0,
      stayedAvgDailyRate: 0,
      cancellationRate: Number(data?.cancellation?.rate) || 0,
      stayedRoomNights: 0,
      stayedEarnings: 0,
      avgBookingWindow: 0,
      avgLengthOfStay: 0,
      openProperties: rows.filter((row) => row.status === "Live").length,
      totalProperties: rows.length,
    },
    properties,
  };
}
