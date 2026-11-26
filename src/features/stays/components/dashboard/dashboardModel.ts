import type { DashboardPropertyRow, PropertyStatus } from "@/types/stays";

/** The three page sections in the Booking.com-style group homepage. */
export const DASHBOARD_TABS = ["operations", "performance", "settings"] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

/** "All" is the default; the rest are the property statuses the workspace uses. */
export const PROPERTY_STATUS_FILTERS = ["All", "Live", "Paused", "Draft", "Under review"] as const;
export type PropertyStatusFilter = (typeof PROPERTY_STATUS_FILTERS)[number];

export type DashboardColumnKey =
  | "property"
  | "status"
  | "arrivalsNext48h"
  | "departuresNext48h"
  | "guestMessages"
  | "supportMessages";

export type DashboardColumn = {
  key: DashboardColumnKey;
  label: string;
  /** The first three identify the row, so Customise data cannot hide them. */
  mandatory?: boolean;
};

export const DASHBOARD_COLUMNS: DashboardColumn[] = [
  { key: "property", label: "Property", mandatory: true },
  { key: "status", label: "Status on Travio", mandatory: true },
  { key: "arrivalsNext48h", label: "Arrivals in next 48 hours" },
  { key: "departuresNext48h", label: "Departures in next 48 hours" },
  { key: "guestMessages", label: "Guest messages" },
  { key: "supportMessages", label: "Travio messages" },
];

export type DashboardDensity = "comfortable" | "compact";

/** One saved view per tab. */
export type DashboardViewKey = DashboardTab;

export type DashboardViewPrefs<K extends string = DashboardColumnKey> = {
  hiddenColumns: K[];
  density: DashboardDensity;
};

export const DEFAULT_DASHBOARD_VIEW: DashboardViewPrefs = {
  hiddenColumns: [],
  density: "comfortable",
};

export const DASHBOARD_COLUMN_KEYS = DASHBOARD_COLUMNS.map((column) => column.key);

function viewStorageKey(view: DashboardViewKey) {
  return `stays.dashboard.view.${view}.v1`;
}

/** Read a tab's saved column/density preference, tolerating old or corrupt values. */
export function readDashboardView<K extends string>(
  view: DashboardViewKey,
  allowedColumns: readonly K[],
  defaultDensity: DashboardDensity = "comfortable",
): DashboardViewPrefs<K> {
  const fallback: DashboardViewPrefs<K> = { hiddenColumns: [], density: defaultDensity };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(viewStorageKey(view));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DashboardViewPrefs<K>> | null;
    const allowed = new Set(allowedColumns);
    const hiddenColumns = Array.isArray(parsed?.hiddenColumns)
      ? parsed.hiddenColumns.filter((column): column is K => allowed.has(column as K))
      : [];
    return {
      hiddenColumns,
      density:
        parsed?.density === "compact"
          ? "compact"
          : parsed?.density === "comfortable"
            ? "comfortable"
            : defaultDensity,
    };
  } catch {
    return fallback;
  }
}

export function writeDashboardView<K extends string>(view: DashboardViewKey, prefs: DashboardViewPrefs<K>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(viewStorageKey(view), JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode, quota); the view still works
    // for this session.
  }
}

export type DashboardFilters = {
  /** City name, or "all". */
  location: string;
  status: PropertyStatusFilter;
  query: string;
};

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  location: "all",
  status: "All",
  query: "",
};

export function isPropertyStatusFilter(value: string | null): value is PropertyStatusFilter {
  return Boolean(value) && (PROPERTY_STATUS_FILTERS as readonly string[]).includes(value as string);
}

export type DashboardRowIdentity = {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
};

export type DashboardRowFilters = {
  location: string;
  query: string;
};

/** Shared location + free-text filter used by all three tabs. */
export function filterDashboardRows<T extends DashboardRowIdentity>(
  rows: T[],
  filters: DashboardRowFilters,
): T[] {
  const location = filters.location.trim().toLowerCase();
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (location && location !== "all" && row.city.trim().toLowerCase() !== location) return false;
    if (!query) return true;
    return `${row.id} ${row.name} ${row.city} ${row.region} ${row.country}`.toLowerCase().includes(query);
  });
}

export function filterDashboardProperties(
  rows: DashboardPropertyRow[],
  filters: DashboardFilters,
): DashboardPropertyRow[] {
  const filtered = filterDashboardRows(rows, filters);
  if (filters.status === "All") return filtered;
  return filtered.filter((row) => row.status === filters.status);
}

export type DashboardLocationOption = { value: string; label: string };

/** "All locations (3)", then one option per city, alphabetic and counted. */
export function dashboardLocationOptions(rows: DashboardPropertyRow[]): DashboardLocationOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const city = row.city.trim() || "Unspecified";
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [
    { value: "all", label: `All locations (${rows.length})` },
    ...[...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([city, count]) => ({ value: city, label: `${city} (${count})` })),
  ];
}

export function dashboardHasActiveFilters(filters: DashboardFilters): boolean {
  return filters.location !== "all" || filters.status !== "All" || filters.query.trim().length > 0;
}

/** What the status cell reads: Booking.com's "Closed / Not bookable" for paused listings. */
export function propertyStatusLabel(status: PropertyStatus): string {
  if (status === "Paused") return "Closed / Not bookable";
  return status;
}

/** The online status used by the CSV and the table. */
export function csvValue(row: DashboardPropertyRow, key: DashboardColumnKey): string | number {
  if (key === "status") return propertyStatusLabel(row.status);
  if (key === "property") return `${row.name} — ${row.city}`;
  return row[key];
}

export function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header + rows → CSV text. Shared by all three dashboard tables. */
export function toCsv(header: string[], rows: Array<Array<string | number>>): string {
  return [header.map(csvCell), ...rows.map((row) => row.map(csvCell))]
    .map((line) => line.join(","))
    .join("\r\n");
}

/** Filtered rows → CSV text, using the columns the user can currently see. */
export function dashboardCsv(rows: DashboardPropertyRow[], visibleColumns: DashboardColumnKey[]): string {
  const columns = DASHBOARD_COLUMNS.filter((column) => visibleColumns.includes(column.key));
  return toCsv(
    columns.map((column) => column.label),
    rows.map((row) => columns.map((column) => csvValue(row, column.key))),
  );
}

/** `travio-properties-2026-11-23.csv` */
export function dashboardCsvFilename(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `travio-properties-${stamp}.csv`;
}

/** Trigger a browser download; a no-op where the API is unavailable (tests). */
export function downloadCsv(filename: string, content: string) {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    return;
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
