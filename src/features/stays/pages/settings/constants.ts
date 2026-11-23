import { User, Bell, Banknote, Shield, FileText, Users } from "@/features/stays/icons";
import { statusEntry, TONE_CLASSES } from "@/lib/statusTones";
import { maskTail } from "../../config/payoutMethodForm";

function maskId(value) {
  if (!value) return "";
  if (String(value).length <= 4) return "••••";
  return `${"•".repeat(String(value).length - 4)}${String(value).slice(-4)}`;
}

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "payouts", label: "Payout Settings", icon: Banknote },
  { key: "security", label: "Security", icon: Shield },
  { key: "tax", label: "Tax Information", icon: FileText },
  { key: "team", label: "Team", icon: Users },
];

/**
 * Stays role copy — the same account roles, described in property terms and
 * passed to the shared picker so it reads correctly on this side.
 */
const STAYS_ROLE_SUMMARIES = {
  admin: "Full access — team, properties, bookings, payouts and settings",
  editor: "Manage properties, bookings and rates",
  finance: "See earnings, payouts and payout methods",
  support: "Handle guest chat and reviews",
};

/**
 * Stays payout statuses (COMPLETED, IN_REVIEW, …) mapped onto the same tones
 * the Experiences page uses for PAID / PENDING / APPROVED / FAILED.
 */
const payoutTone = (status) => statusEntry("payout", status).tone;
const PAYOUT_TONES = Object.fromEntries(
  Object.entries(TONE_CLASSES).map(([tone, c]) => [tone, { iconBg: c.soft, icon: c.text, chip: c.chip, dot: c.dot }]),
);

const FADE_UP: import("framer-motion").Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" as const } },
};

/**
 * The masked identifier for a saved method. Picks whichever identifier that
 * method actually has — a SEPA account only has an IBAN, so falling back to
 * `accountNumber` alone used to render a bare "****" with nothing after it.
 */
function settingsMethodIdentifier(method) {
  return maskTail(method.iban || method.sortCode || method.routingNumber || method.accountNumber || method.mobileNumber);
}

export {
  maskId, TABS, STAYS_ROLE_SUMMARIES, payoutTone, PAYOUT_TONES, FADE_UP,
  settingsMethodIdentifier,
};
