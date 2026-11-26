export type PromotionDealKind = "basic-deal" | "early-booker" | "last-minute" | "late-escape";

export type PromotionDealConfig = {
  kind: PromotionDealKind;
  title: string;
  defaultName: string;
  bookWindow: "none" | "minimum-days" | "maximum-days-hours";
  discountMin: number;
  discountDefault: number;
  lengthOfStay: boolean;
  lateEscape?: {
    description: string;
    bookDates: string;
    stayFrom: string;
    stayTo: string;
    calendarFrom: string;
    calendarTo: string;
    defaultMonth: Date;
  };
};

export const PROMOTION_DEALS: Record<PromotionDealKind, PromotionDealConfig> = {
  "basic-deal": {
    kind: "basic-deal",
    title: "Basic Deal",
    defaultName: "Basic Deal",
    bookWindow: "none",
    discountMin: 1,
    discountDefault: 10,
    lengthOfStay: false,
  },
  "early-booker": {
    kind: "early-booker",
    title: "Early Booker Deal",
    defaultName: "Early Booker Deal",
    bookWindow: "minimum-days",
    discountMin: 1,
    discountDefault: 10,
    lengthOfStay: true,
  },
  "last-minute": {
    kind: "last-minute",
    title: "Last Minute Deal",
    defaultName: "Last Minute Deal",
    bookWindow: "maximum-days-hours",
    discountMin: 1,
    discountDefault: 10,
    lengthOfStay: true,
  },
  "late-escape": {
    kind: "late-escape",
    title: "Late Escape Deal",
    defaultName: "Late Escape Deal",
    bookWindow: "none",
    discountMin: 15,
    discountDefault: 20,
    lengthOfStay: false,
    lateEscape: {
      description: "This promotion has some preselected items – review and customise the rest",
      bookDates: "From 3 Sept 2026 to 7 Jan 2027",
      stayFrom: "2026-10-01",
      stayTo: "2027-01-07",
      calendarFrom: "2026-11-26",
      calendarTo: "2026-12-31",
      defaultMonth: new Date(2026, 10, 1),
    },
  },
};
