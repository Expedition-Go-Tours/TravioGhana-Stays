import { isoDaysBetween, shiftISODays, weekdayOf } from "./dates";

export type CopyRateAdjustment = {
  direction: "increase" | "decrease";
  unit: "amount" | "percent";
  value: number;
};

/**
 * Pairs source and target dates by weekday so the first Monday in the source
 * range lands on the first Monday in the target range, and so on.
 */
export function copyDatePairs({
  from,
  to,
  targetFrom,
  targetTo,
  weekdays,
}: {
  from: string;
  to: string;
  targetFrom: string;
  targetTo?: string;
  weekdays?: number[];
}) {
  const sourceDays = isoDaysBetween(from, to);
  if (!sourceDays.length || !targetFrom) return [];
  const targetDays = isoDaysBetween(targetFrom, targetTo || shiftISODays(targetFrom, sourceDays.length - 1));
  if (!weekdays) {
    return sourceDays
      .map((source, index) => ({ source, target: targetDays[index] }))
      .filter((pair): pair is { source: string; target: string } => Boolean(pair.target));
  }
  if (!weekdays.length) return [];
  const selected = new Set(weekdays);
  const pairs: Array<{ source: string; target: string }> = [];

  for (let day = 0; day < 7; day += 1) {
    if (!selected.has(day)) continue;
    const sourceForDay = sourceDays.filter((date) => weekdayOf(date) === day);
    const targetForDay = targetDays.filter((date) => weekdayOf(date) === day);
    const count = Math.min(sourceForDay.length, targetForDay.length);
    for (let index = 0; index < count; index += 1) {
      pairs.push({ source: sourceForDay[index], target: targetForDay[index] });
    }
  }

  return pairs.sort((a, b) => a.source.localeCompare(b.source));
}

export function applyCopyAdjustment(price: number, adjustment?: CopyRateAdjustment | null) {
  const base = Number(price) || 0;
  if (!adjustment || !adjustment.value || adjustment.direction === undefined) return base;
  const delta =
    adjustment.unit === "percent" ? (base * Math.max(0, adjustment.value)) / 100 : Math.max(0, adjustment.value);
  const next = adjustment.direction === "increase" ? base + delta : base - delta;
  return Math.max(0, Math.round(next * 100) / 100);
}
