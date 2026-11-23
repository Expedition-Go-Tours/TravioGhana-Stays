/**
 * One status vocabulary for every badge in the dashboard.
 *
 * Replaces the four parallel systems that used to exist (the hex map in
 * StatusBadge, StaysPill's tones, the Finance page's local badges and the
 * Settings payout tone maps). Each domain maps a raw status to a tone and the
 * label users see; `<StatusBadge domain="…" status="…" />` renders it.
 *
 * Tones are semantic and theme-aware (see index.css):
 *   success · warning · danger · info · neutral · brand · accent
 */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand" | "accent";

export type StatusDomain =
  | "booking"
  | "bookingApi"
  | "property"
  | "earning"
  | "payout"
  | "charge"
  | "refund"
  | "claim"
  | "offer"
  | "document";

type Entry = { tone: Tone; label: string };

export const STATUS_TONES: Record<StatusDomain, Record<string, Entry>> = {
  // Stays booking display statuses (mock + API).
  booking: {
    New: { tone: "warning", label: "New" },
    Confirmed: { tone: "info", label: "Confirmed" },
    "Checked in": { tone: "info", label: "Checked in" },
    Completed: { tone: "success", label: "Completed" },
    Cancelled: { tone: "danger", label: "Cancelled" },
    "No-show": { tone: "danger", label: "No-show" },
  },
  // Uppercase booking / product statuses from the shared supplier API.
  bookingApi: {
    AWAITING_CONFIRMATION: { tone: "warning", label: "Awaiting confirmation" },
    CONFIRMED: { tone: "info", label: "Confirmed" },
    CANCELLED: { tone: "danger", label: "Cancelled" },
    REJECTED: { tone: "danger", label: "Rejected" },
    REFUND_REQUEST: { tone: "warning", label: "Refund requested" },
    REFUNDED: { tone: "info", label: "Refunded" },
    REFUND_REJECTED: { tone: "neutral", label: "Refund rejected" },
    AMENDMENT_REQUEST: { tone: "warning", label: "Amendment requested" },
    AMENDED: { tone: "info", label: "Amended" },
    PAID: { tone: "success", label: "Paid" },
    PENDING: { tone: "neutral", label: "Pending" },
    FAILED: { tone: "danger", label: "Failed" },
    ACTIVE: { tone: "success", label: "Active" },
    INACTIVE: { tone: "neutral", label: "Inactive" },
    DRAFT: { tone: "neutral", label: "Draft" },
    PENDING_APPROVAL: { tone: "info", label: "Pending approval" },
    COMPLETED: { tone: "success", label: "Completed" },
  },
  property: {
    Live: { tone: "success", label: "Live" },
    // Draft and Paused need the host's attention, so they read as warnings.
    Draft: { tone: "warning", label: "Draft" },
    "Under review": { tone: "warning", label: "Under review" },
    Paused: { tone: "warning", label: "Paused" },
  },
  earning: {
    ELIGIBLE: { tone: "success", label: "Eligible" },
    PENDING: { tone: "warning", label: "Clearing" },
    REQUESTED: { tone: "info", label: "Requested" },
    PAID: { tone: "brand", label: "Paid" },
    DISPUTED: { tone: "danger", label: "On hold" },
    CANCELLED: { tone: "neutral", label: "Cancelled" },
    FAILED: { tone: "danger", label: "Failed" },
  },
  payout: {
    COMPLETED: { tone: "success", label: "Completed" },
    PAID: { tone: "success", label: "Paid" },
    APPROVED: { tone: "info", label: "Approved" },
    IN_REVIEW: { tone: "warning", label: "In review" },
    PENDING: { tone: "warning", label: "Pending" },
    CANCELLED: { tone: "danger", label: "Cancelled" },
    REJECTED: { tone: "danger", label: "Rejected" },
    FAILED: { tone: "danger", label: "Failed" },
  },
  // The cancellation-fee ledger.
  charge: {
    OPEN: { tone: "warning", label: "Open" },
    SETTLED: { tone: "success", label: "Settled" },
    WAIVED: { tone: "neutral", label: "Waived" },
  },
  // Supplier-filed refund requests.
  refund: {
    OPEN: { tone: "warning", label: "Open" },
    UNDER_REVIEW: { tone: "info", label: "Under review" },
    RESOLVED_CUSTOMER: { tone: "danger", label: "Refunded" },
    RESOLVED_SUPPLIER: { tone: "success", label: "Denied" },
    WITHDRAWN: { tone: "neutral", label: "Withdrawn" },
  },
  // Guest-filed refund claims.
  claim: {
    SUBMITTED: { tone: "warning", label: "Awaiting your decision" },
    SUPPLIER_APPROVED: { tone: "info", label: "Approved" },
    SUPPLIER_DECLINED: { tone: "neutral", label: "Declined" },
    RELEASED: { tone: "success", label: "Refund released" },
  },
  offer: {
    active: { tone: "success", label: "Active" },
    scheduled: { tone: "info", label: "Scheduled" },
    expired: { tone: "neutral", label: "Expired" },
    inactive: { tone: "neutral", label: "Inactive" },
  },
  document: {
    APPROVED: { tone: "success", label: "Approved" },
    PENDING: { tone: "warning", label: "In review" },
    REJECTED: { tone: "danger", label: "Rejected" },
    REPLACEMENT_REQUESTED: { tone: "danger", label: "Replacement requested" },
    EXPIRED: { tone: "danger", label: "Expired" },
    MISSING: { tone: "neutral", label: "Not uploaded" },
  },
};

/** "PENDING_APPROVAL" → "Pending approval" — for statuses no map knows yet. */
export function humanizeStatus(status: string): string {
  const words = String(status || "").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Unknown";
}

export function statusEntry(domain: StatusDomain, status: string | null | undefined): Entry {
  const key = String(status ?? "");
  return STATUS_TONES[domain][key] ?? { tone: "neutral", label: humanizeStatus(key) };
}

/**
 * Class fragments per tone, for places that colour more than a badge (an icon
 * tile, a dot, a left rail). All theme-aware.
 */
export const TONE_CLASSES: Record<Tone, { chip: string; soft: string; text: string; dot: string; border: string }> = {
  success: { chip: "bg-success-soft text-success", soft: "bg-success-soft", text: "text-success", dot: "bg-success", border: "border-success/30" },
  warning: { chip: "bg-warning-soft text-warning", soft: "bg-warning-soft", text: "text-warning", dot: "bg-warning", border: "border-warning/30" },
  danger: { chip: "bg-danger-soft text-danger", soft: "bg-danger-soft", text: "text-danger", dot: "bg-danger", border: "border-danger/30" },
  info: { chip: "bg-info-soft text-info", soft: "bg-info-soft", text: "text-info", dot: "bg-info", border: "border-info/30" },
  neutral: { chip: "bg-surface-strong text-body", soft: "bg-surface-strong", text: "text-body", dot: "bg-subtle", border: "border-hairline-strong" },
  brand: { chip: "bg-brand-soft text-brand-ink", soft: "bg-brand-soft", text: "text-brand-ink", dot: "bg-brand", border: "border-brand/30" },
  accent: { chip: "bg-accent-soft text-accent-ink", soft: "bg-accent-soft", text: "text-accent-ink", dot: "bg-accent", border: "border-accent/40" },
};
