import type { AvailabilityOverride, RestrictionRule, RoomType } from "@/types/stays";
import { fromISODate } from "./dates";

/** Does a rule cover this room on this calendar date? */
export function ruleApplies(rule: RestrictionRule, roomId: string, date: string): boolean {
  if (!rule.active) return false;
  if (rule.roomIds?.length && !rule.roomIds.includes(roomId)) return false;
  if (rule.from && date < rule.from) return false;
  if (rule.to && date > rule.to) return false;
  const weekdays = rule.weekdays ?? [];
  if (weekdays.length) {
    try {
      if (!weekdays.includes(fromISODate(date).getDay())) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Merge active restriction rules over the stored per-date overrides for one
 * room, so the calendar and its editor see the effective block/minimum stay.
 * Rules never mutate the stored overrides; they are a display/booking layer.
 */
export function applyRestrictionRules(
  room: Pick<RoomType, "id">,
  days: string[],
  overrides: Record<string, AvailabilityOverride>,
  rules: RestrictionRule[] = [],
): Record<string, AvailabilityOverride> {
  if (!rules.length) return overrides;
  const merged = { ...overrides };

  for (const date of days) {
    const matching = rules.filter((rule) => ruleApplies(rule, room.id, date));
    if (!matching.length) continue;

    const key = `${room.id}|${date}`;
    const next: AvailabilityOverride = { ...(merged[key] || {}) };
    for (const rule of matching) {
      if (rule.closed) next.closed = true;
      if (rule.minStay && rule.minStay > 0) next.minStay = rule.minStay;
      if (rule.maxStay && rule.maxStay > 0) next.maxStay = rule.maxStay;
      if (rule.closedArrival) next.closedArrival = true;
      if (rule.closedDeparture) next.closedDeparture = true;
    }
    merged[key] = next;
  }

  return merged;
}
