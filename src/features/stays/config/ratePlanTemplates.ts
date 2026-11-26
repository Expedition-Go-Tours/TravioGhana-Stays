import type { RatePlanTemplateKey } from "@/types/stays";

export type RatePlanCancellation =
  | "flexible-1-day"
  | "flexible-14-days"
  | "non-refundable";

export type RatePlanTemplate = {
  key: RatePlanTemplateKey;
  name: string;
  tagline: string;
  group: "foundation" | "wider" | "custom";
  /** Fixed stay length, set without asking. */
  fixedMinStay?: number;
  /** Ask “minimum length of stay?” for the remaining templates. */
  askMinStay: boolean;
  cancellationChoices: RatePlanCancellation[];
  defaultCancellation: RatePlanCancellation;
  /** Firm is a fixed policy, shown as a read-only callout. */
  fixedCancellationLabel?: string;
  /** Signed percentage relative to the base plan. */
  defaultAdjustmentPct: number;
  adjustmentKind: "markup" | "discount" | "choice";
  defaultManagement: "existing" | "new";
  defaultName: string;
  /** Show “any time / at least N days before check-in”. */
  askBookingWindow: boolean;
  defaultMinAdvanceDays: number;
};

export const RATE_PLAN_TEMPLATES: RatePlanTemplate[] = [
  {
    key: "flexible",
    name: "Flexible",
    tagline: "Let guests cancel for free and they'll boost your bookings and revenue",
    group: "foundation",
    askMinStay: true,
    cancellationChoices: ["flexible-1-day", "flexible-14-days", "non-refundable"],
    defaultCancellation: "flexible-1-day",
    defaultAdjustmentPct: 10,
    adjustmentKind: "markup",
    defaultManagement: "existing",
    defaultName: "Fully flexible",
    askBookingWindow: false,
    defaultMinAdvanceDays: 0,
  },
  {
    key: "firm",
    name: "Firm",
    tagline:
      "Strengthen your competitive edge without having to worry about last minute cancellations with this 14-day cancellation policy",
    group: "foundation",
    askMinStay: true,
    cancellationChoices: ["flexible-14-days"],
    defaultCancellation: "flexible-14-days",
    fixedCancellationLabel: "Flexible - 14 days",
    defaultAdjustmentPct: 5,
    adjustmentKind: "markup",
    defaultManagement: "existing",
    defaultName: "Firm rate plan",
    askBookingWindow: false,
    defaultMinAdvanceDays: 0,
  },
  {
    key: "non-refundable",
    name: "Non-refundable",
    tagline: "Reduce cancellations by attracting guests who are sure of their dates",
    group: "foundation",
    askMinStay: true,
    cancellationChoices: ["non-refundable", "flexible-1-day"],
    defaultCancellation: "non-refundable",
    defaultAdjustmentPct: -10,
    adjustmentKind: "discount",
    defaultManagement: "existing",
    defaultName: "Non-refundable",
    askBookingWindow: true,
    defaultMinAdvanceDays: 0,
  },
  {
    key: "weekly",
    name: "Weekly",
    tagline: "Stand out to guests looking to stay longer than 1 week",
    group: "wider",
    fixedMinStay: 7,
    askMinStay: false,
    cancellationChoices: ["flexible-1-day", "non-refundable"],
    defaultCancellation: "flexible-1-day",
    defaultAdjustmentPct: -15,
    adjustmentKind: "discount",
    defaultManagement: "existing",
    defaultName: "Weekly rate",
    askBookingWindow: true,
    defaultMinAdvanceDays: 0,
  },
  {
    key: "monthly",
    name: "Monthly",
    tagline: "Earn more stable income from guests who stay 28+ nights",
    group: "wider",
    fixedMinStay: 28,
    askMinStay: false,
    cancellationChoices: ["flexible-1-day", "non-refundable"],
    defaultCancellation: "flexible-1-day",
    defaultAdjustmentPct: -30,
    adjustmentKind: "discount",
    defaultManagement: "existing",
    defaultName: "Monthly rate",
    askBookingWindow: true,
    defaultMinAdvanceDays: 0,
  },
  {
    key: "early-booker",
    name: "Early booker",
    tagline: "Get more bookings earlier by attracting guests who plan ahead",
    group: "wider",
    askMinStay: true,
    cancellationChoices: ["non-refundable", "flexible-1-day"],
    defaultCancellation: "non-refundable",
    defaultAdjustmentPct: -15,
    adjustmentKind: "discount",
    defaultManagement: "existing",
    defaultName: "Early booker rate plan (15+ days)",
    askBookingWindow: true,
    defaultMinAdvanceDays: 15,
  },
  {
    key: "custom",
    name: "Custom",
    tagline: "Customise a rate plan to suit your needs",
    group: "custom",
    askMinStay: true,
    cancellationChoices: ["flexible-1-day", "non-refundable"],
    defaultCancellation: "flexible-1-day",
    defaultAdjustmentPct: -10,
    adjustmentKind: "choice",
    defaultManagement: "existing",
    defaultName: "",
    askBookingWindow: true,
    defaultMinAdvanceDays: 0,
  },
];

export const RATE_PLAN_GROUPS = [
  {
    id: "foundation" as const,
    title: "Increase bookings and reduce cancellations",
    description: "These rate plans will give you a solid foundation for your pricing strategy.",
  },
  {
    id: "wider" as const,
    title: "Attract a wider range of guests",
    description:
      "After establishing your foundation, these rate plans can help you build on it and make your property more appealing to high-value user groups.",
  },
  {
    id: "custom" as const,
    title: "Custom plan",
    description: "Set up a rate plan tailored to your property and business goals.",
  },
];

export function ratePlanTemplate(key: string): RatePlanTemplate | undefined {
  return RATE_PLAN_TEMPLATES.find((template) => template.key === key);
}

export function cancellationLabel(value: RatePlanCancellation): string {
  if (value === "flexible-14-days") return "Flexible - 14 days";
  if (value === "non-refundable") return "Non-refundable";
  return "Flexible - 1 day";
}

/** Map the friendly policy label onto the stored rate-plan fields. */
export function cancellationFields(value: RatePlanCancellation) {
  if (value === "non-refundable") {
    return {
      cancellation: "Non-refundable",
      freeCancellationHours: 0,
      penalty: "Full stay",
      noShow: "Full stay",
    };
  }
  return {
    cancellation: "Free cancellation",
    freeCancellationHours: value === "flexible-14-days" ? 336 : 24,
    penalty: "First night",
    noShow: "First night",
  };
}
