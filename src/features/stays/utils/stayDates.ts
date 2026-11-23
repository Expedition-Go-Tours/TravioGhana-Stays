/**
 * Stay date ranges in the shared en-US style ("Oct 4 – 8", "Oct 30 – Nov 2").
 *
 * Booking dates are calendar dates (`yyyy-MM-dd`) with no time zone, so they
 * are parsed as local dates: `new Date("2026-10-04")` would be UTC midnight and
 * can show as Oct 3 west of Greenwich.
 */
const LOCALE = "en-US";
const DAY_MS = 86_400_000;

const sameYear = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric" });
const withYear = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric" });

export function parseISODate(iso: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole nights between check-in and check-out; null when either date is unreadable. */
export function nightsBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return null;
  // Rounded, so a daylight-saving change inside the stay does not lose a night.
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

/** "Oct 4 – 8"; adds years when the stay crosses into a new one. Falls back to the raw strings. */
export function formatStayRange(from: string | null | undefined, to: string | null | undefined): string {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return [from, to].filter(Boolean).join(" – ") || "—";
  const formatter = start.getFullYear() === end.getFullYear() ? sameYear : withYear;
  return formatter.formatRange(start, end);
}

const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

/** "Sun, Oct 4, 2026"; the raw string when it can't be read. */
export function formatStayDate(iso: string | null | undefined): string {
  const date = parseISODate(iso);
  return date ? longDate.format(date) : String(iso ?? "") || "—";
}

/** "1 night", "4 nights". */
export function nightsLabel(nights: number | null): string | null {
  if (nights == null) return null;
  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}
