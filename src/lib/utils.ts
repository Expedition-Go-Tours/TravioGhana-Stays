import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { formatMoney } from "./money";

export function safeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

/**
 * Merge class names, resolving Tailwind conflicts. Knows about the app's own
 * text-size tokens (text-caption, text-h1, …) so `text-caption text-ink`
 * keeps both instead of treating the size as a colour.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["overline", "caption", "body", "h3", "h2", "h1", "display"],
      radius: ["control", "card", "sheet", "pill"],
    },
  },
});
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}

/** Money in the shared standard (`lib/money.ts`). Defaults to USD. */
export function formatCurrency(amount: unknown, currency?: string): string {
  return formatMoney(amount, currency);
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT_OPTIONS,
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleDateString("en-GB", DATE_FORMAT_OPTIONS);
}

export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeString;
  const period = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleString("en-GB", DATE_TIME_FORMAT_OPTIONS);
}
