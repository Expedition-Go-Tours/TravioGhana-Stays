/**
 * The Availability workspace's sub-pages. The sidebar renders these as a
 * submenu, and the page switches on `?section=` (the same URL pattern the
 * Settings tabs use), so a section is linkable and survives a refresh.
 */
export const AVAILABILITY_SECTIONS = [
  {
    slug: "calendar",
    label: "Calendar",
    description: "See prices, rooms left and restrictions for every date.",
    keywords: ["calendar", "dates", "inventory", "prices", "rooms"],
  },
  {
    slug: "open-close-rooms",
    label: "Open/close rooms",
    description: "",
    keywords: ["open", "close", "block", "rooms", "inventory", "dates"],
  },
  {
    slug: "copy-rates",
    label: "Copy rates to future dates",
    description:
      "Here you can copy over your existing rate plans to a date range of your choosing, easily and efficiently.",
    keywords: ["copy", "rates", "prices", "future", "dates", "bulk"],
  },
  {
    slug: "restrictions",
    label: "Dynamic restriction rules",
    description: "",
    keywords: ["restrictions", "minimum stay", "maximum stay", "arrival", "rules"],
  },
  {
    slug: "pricing-per-guest",
    label: "Pricing per guest",
    description: "",
    keywords: ["pricing", "guests", "occupancy", "extra adult", "per person"],
  },
  {
    slug: "child-rates",
    label: "Child rates",
    description: "",
    keywords: ["child", "children", "rates", "family", "extra child"],
  },
] as const;

export type AvailabilitySection = (typeof AVAILABILITY_SECTIONS)[number];
export type AvailabilitySectionSlug = AvailabilitySection["slug"];

export const DEFAULT_AVAILABILITY_SECTION: AvailabilitySectionSlug = "calendar";

export function availabilitySectionFor(value: string | null): AvailabilitySection {
  return (
    AVAILABILITY_SECTIONS.find((section) => section.slug === value) ??
    AVAILABILITY_SECTIONS[0]
  );
}

export function availabilitySectionPath(slug: string): string {
  return `/stays/availability?section=${encodeURIComponent(slug)}`;
}
