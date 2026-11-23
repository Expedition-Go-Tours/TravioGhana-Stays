import type { DashboardPropertyRow, DashboardSettings, DashboardSettingsProperty } from "@/types/stays";
import { toCsv } from "./dashboardModel";

export type SettingsColumnKey =
  | "id"
  | "property"
  | "rewards"
  | "preferred"
  | "minimumStay"
  | "localRates"
  | "mobileRates"
  | "listingScore";

export type SettingsColumn = {
  key: SettingsColumnKey;
  label: string;
  mandatory?: boolean;
};

export const SETTINGS_COLUMNS: SettingsColumn[] = [
  { key: "id", label: "ID", mandatory: true },
  { key: "property", label: "Property", mandatory: true },
  { key: "rewards", label: "Travio Rewards" },
  { key: "preferred", label: "Preferred" },
  { key: "minimumStay", label: "Minimum stay" },
  { key: "localRates", label: "Local rates" },
  { key: "mobileRates", label: "Mobile rates" },
  { key: "listingScore", label: "Listing score" },
];

export const SETTINGS_COLUMN_KEYS = SETTINGS_COLUMNS.map((column) => column.key);

export function eligibleLabel(value: boolean): string {
  return value ? "Eligible" : "Not eligible";
}

export function rateLabel(value: boolean): string {
  return value ? "Active" : "Add now";
}

export function minimumStayLabel(value: number): string {
  return `${value} ${value === 1 ? "night" : "nights"}`;
}

export function listingScoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

function settingsValue(
  row: DashboardSettingsProperty,
  key: SettingsColumnKey,
): string | number {
  if (key === "property") return `${row.name} — ${row.city}`;
  if (key === "rewards") return eligibleLabel(row.rewardsEligible);
  if (key === "preferred") return eligibleLabel(row.preferredEligible);
  if (key === "minimumStay") return minimumStayLabel(row.minimumStay);
  if (key === "localRates") return row.localRates ? "Active" : "Not set";
  if (key === "mobileRates") return row.mobileRates ? "Active" : "Not set";
  if (key === "listingScore") return `${row.listingScore}%`;
  return row[key];
}

export function settingsCsv(
  rows: DashboardSettingsProperty[],
  visibleColumns: SettingsColumnKey[],
): string {
  const columns = SETTINGS_COLUMNS.filter((column) => visibleColumns.includes(column.key));
  return toCsv(
    columns.map((column) => column.label),
    rows.map((row) => columns.map((column) => settingsValue(row, column.key))),
  );
}

export function settingsCsvFilename(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `travio-property-settings-${stamp}.csv`;
}

/**
 * A Settings payload built from the operations property rows when the live
 * endpoint does not yet include the optional `settings` block. Unknown values
 * render as not-eligible / not-set rather than an unavailable page.
 */
export function fallbackSettings(rows: DashboardPropertyRow[]): DashboardSettings {
  return {
    properties: rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region,
      country: row.country,
      photo: row.photo,
      rewardsEligible: false,
      preferredEligible: false,
      minimumStay: 1,
      localRates: false,
      mobileRates: false,
      listingScore: 0,
    })),
  };
}
