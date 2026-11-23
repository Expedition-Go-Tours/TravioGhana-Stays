import { STATUS_TONES, type Tone } from "@/lib/statusTones";

/**
 * Booking / property status → the colour name `StaysPill` takes, read from
 * the shared status map (`lib/statusTones`) so a chip looks the same wherever
 * it appears. Unknown statuses are green, as before.
 */
const PILL: Record<Tone, "green" | "amber" | "blue" | "red"> = {
  success: "green",
  brand: "green",
  warning: "amber",
  accent: "amber",
  info: "blue",
  danger: "red",
  neutral: "green",
};

export function statusTone(status: string | null | undefined) {
  const key = String(status ?? "");
  const entry = STATUS_TONES.booking[key] ?? STATUS_TONES.property[key];
  return entry ? PILL[entry.tone] : "green";
}

/** Booking statuses offered by the reservation editor (prototype order). */
export const BOOKING_STATUSES = ["New", "Confirmed", "Checked in", "Completed", "Cancelled", "No-show"];

/** Property statuses offered by the properties filter. */
export const PROPERTY_STATUSES = ["All", "Live", "Under review", "Draft", "Paused"];
