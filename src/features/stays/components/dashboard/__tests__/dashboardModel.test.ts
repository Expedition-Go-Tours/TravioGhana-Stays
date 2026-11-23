import { beforeEach, describe, expect, it } from "vitest";
import type { DashboardPropertyRow } from "@/types/stays";
import {
  DASHBOARD_COLUMN_KEYS,
  DEFAULT_DASHBOARD_VIEW,
  dashboardCsv,
  dashboardCsvFilename,
  dashboardHasActiveFilters,
  dashboardLocationOptions,
  filterDashboardProperties,
  readDashboardView,
  writeDashboardView,
} from "../dashboardModel";

const ROWS: DashboardPropertyRow[] = [
  {
    id: "p1",
    name: "Akwaaba Coast Hotel",
    city: "Accra",
    region: "Greater Accra",
    country: "Ghana",
    photo: null,
    status: "Live",
    bookable: true,
    arrivalsNext48h: 2,
    departuresNext48h: 0,
    guestMessages: 3,
    supportMessages: 0,
  },
  {
    id: "p2",
    name: "Kumasi Gardens Lodge",
    city: "Kumasi",
    region: "Ashanti",
    country: "Ghana",
    photo: null,
    status: "Paused",
    bookable: false,
    arrivalsNext48h: 0,
    departuresNext48h: 1,
    guestMessages: 1,
    supportMessages: 0,
  },
  {
    id: "p3",
    name: "Cape Coast, \"Heritage\" Inn",
    city: "Cape Coast",
    region: "Central",
    country: "Ghana",
    photo: null,
    status: "Under review",
    bookable: false,
    arrivalsNext48h: 0,
    departuresNext48h: 0,
    guestMessages: 0,
    supportMessages: 0,
  },
];

beforeEach(() => localStorage.clear());

describe("dashboard filters", () => {
  it("filters by city, status and free text", () => {
    expect(filterDashboardProperties(ROWS, { location: "Kumasi", status: "All", query: "" })).toHaveLength(1);
    expect(filterDashboardProperties(ROWS, { location: "all", status: "Paused", query: "" })[0].id).toBe("p2");
    expect(filterDashboardProperties(ROWS, { location: "all", status: "All", query: "cape coast" })[0].id).toBe("p3");
    expect(filterDashboardProperties(ROWS, { location: "all", status: "All", query: "p1" })[0].id).toBe("p1");
    expect(filterDashboardProperties(ROWS, { location: "Accra", status: "Paused", query: "" })).toHaveLength(0);
  });

  it("builds location options with counts, plus the all option", () => {
    expect(dashboardLocationOptions(ROWS)).toEqual([
      { value: "all", label: "All locations (3)" },
      { value: "Accra", label: "Accra (1)" },
      { value: "Cape Coast", label: "Cape Coast (1)" },
      { value: "Kumasi", label: "Kumasi (1)" },
    ]);
  });

  it("knows when filters are active", () => {
    expect(dashboardHasActiveFilters({ location: "all", status: "All", query: "  " })).toBe(false);
    expect(dashboardHasActiveFilters({ location: "Kumasi", status: "All", query: "" })).toBe(true);
    expect(dashboardHasActiveFilters({ location: "all", status: "Live", query: "" })).toBe(true);
    expect(dashboardHasActiveFilters({ location: "all", status: "All", query: "p1" })).toBe(true);
  });
});

describe("dashboard CSV", () => {
  it("exports the visible columns and the friendly paused label", () => {
    const csv = dashboardCsv(ROWS.slice(0, 2), ["id", "property", "status", "guestMessages"]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("ID,Property,Status on Travio,Guest messages");
    expect(lines[1]).toBe("p1,Akwaaba Coast Hotel — Accra,Live,3");
    expect(lines[2]).toBe("p2,Kumasi Gardens Lodge — Kumasi,Closed / Not bookable,1");
  });

  it("quotes commas and embedded quotes", () => {
    const csv = dashboardCsv([ROWS[2]], ["id", "property"]);
    expect(csv).toBe('ID,Property\r\np3,"Cape Coast, ""Heritage"" Inn — Cape Coast"');
  });

  it("names the file by date", () => {
    expect(dashboardCsvFilename(new Date(2026, 10, 23))).toBe("travio-properties-2026-11-23.csv");
  });
});

describe("dashboard view preferences", () => {
  it("round-trips visible columns and density through local storage", () => {
    expect(readDashboardView("operations", DASHBOARD_COLUMN_KEYS)).toEqual(DEFAULT_DASHBOARD_VIEW);

    writeDashboardView("operations", { hiddenColumns: ["guestMessages"], density: "compact" });
    expect(readDashboardView("operations", DASHBOARD_COLUMN_KEYS)).toEqual({
      hiddenColumns: ["guestMessages"],
      density: "compact",
    });
  });

  it("keeps each tab's preference separate", () => {
    writeDashboardView("operations", { hiddenColumns: ["guestMessages"], density: "compact" });
    expect(readDashboardView("performance", DASHBOARD_COLUMN_KEYS)).toEqual(DEFAULT_DASHBOARD_VIEW);
    expect(readDashboardView("settings", DASHBOARD_COLUMN_KEYS)).toEqual(DEFAULT_DASHBOARD_VIEW);
  });

  it("ignores unknown columns and corrupt payloads", () => {
    localStorage.setItem(
      "stays.dashboard.view.operations.v1",
      JSON.stringify({ hiddenColumns: ["bogus"], density: "huge" }),
    );
    expect(readDashboardView("operations", DASHBOARD_COLUMN_KEYS)).toEqual(DEFAULT_DASHBOARD_VIEW);

    localStorage.setItem("stays.dashboard.view.operations.v1", "{not json");
    expect(readDashboardView("operations", DASHBOARD_COLUMN_KEYS)).toEqual(DEFAULT_DASHBOARD_VIEW);
  });
});
