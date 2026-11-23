import { describe, expect, it } from "vitest";
import type { DashboardSettingsProperty } from "@/types/stays";
import {
  SETTINGS_COLUMN_KEYS,
  eligibleLabel,
  listingScoreTone,
  minimumStayLabel,
  rateLabel,
  settingsCsv,
  settingsCsvFilename,
} from "../settingsModel";

const ROW: DashboardSettingsProperty = {
  id: "p1",
  name: "Akwaaba Coast Hotel",
  city: "Accra",
  region: "Greater Accra",
  country: "Ghana",
  photo: null,
  rewardsEligible: true,
  preferredEligible: false,
  minimumStay: 7,
  localRates: false,
  mobileRates: false,
  listingScore: 64,
};

describe("settings helpers", () => {
  it("labels programme eligibility and rate state", () => {
    expect(eligibleLabel(true)).toBe("Eligible");
    expect(eligibleLabel(false)).toBe("Not eligible");
    expect(rateLabel(true)).toBe("Active");
    expect(rateLabel(false)).toBe("Add now");
    expect(minimumStayLabel(1)).toBe("1 night");
    expect(minimumStayLabel(7)).toBe("7 nights");
  });

  it("bands the listing score", () => {
    expect(listingScoreTone(85)).toBe("success");
    expect(listingScoreTone(64)).toBe("warning");
    expect(listingScoreTone(30)).toBe("danger");
  });

  it("exports the visible columns with readable values", () => {
    const csv = settingsCsv([ROW], ["id", "property", "rewards", "minimumStay", "localRates", "listingScore"]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("ID,Property,Travio Rewards,Minimum stay,Local rates,Listing score");
    expect(lines[1]).toBe("p1,Akwaaba Coast Hotel — Accra,Eligible,7 nights,Not set,64%");
  });

  it("can export every settings column", () => {
    const csv = settingsCsv([ROW], SETTINGS_COLUMN_KEYS);
    expect(csv.split("\r\n")[0].split(",")).toHaveLength(SETTINGS_COLUMN_KEYS.length);
  });

  it("names the file by date", () => {
    expect(settingsCsvFilename(new Date(2026, 10, 23))).toBe("travio-property-settings-2026-11-23.csv");
  });
});
