/**
 * Rate-plan pricing — mirrors the prototype's `planPrice`:
 * a derived plan recalculates from its base plan (or the room's base price),
 * a fixed plan uses its own nightly price. Base-plan chains are resolved
 * recursively with a cycle guard, so a bad link falls back to the room price.
 */
import { roomPeople } from "./rooms";
import type { RatePlan } from "@/types/stays";

export function planPrice(plan: any, room: any, plans: any[] = [], seen = new Set<string>()): number {
  if (plan?.pricingModel === "Derived from room base rate") {
    const id = String(plan?.id || "");
    if (id) seen.add(id);
    let basePrice = Number(room?.price || 0);
    const basePlan = plan?.basePlanId
      ? plans.find((candidate) => candidate.id === plan.basePlanId && !seen.has(candidate.id))
      : null;
    if (basePlan) {
      basePrice = planPrice(basePlan, room, plans, seen);
    }
    return Math.round(basePrice * (1 + Number(plan.adjustmentPct || 0) / 100));
  }
  return Number(plan?.price || 0);
}

/**
 * The default plan the workspace creates for a fresh room (the prototype's
 * `defaultPlan`). Lives here — not in the mock — so the builder, the mock
 * dataset and the API layer share one definition.
 */
export function defaultPlanForRoom(room: any): RatePlan {
  return {
    id: `plan-${room.id}`,
    roomId: room.id,
    name: "Standard rate",
    pricingModel: "Fixed nightly rate",
    price: Number(room.price) || 0,
    weekend: Number(room.weekend || room.price) || 0,
    adjustmentPct: 0,
    meal: room.meal || "Room only",
    cancellation: "Free cancellation",
    freeCancellationHours: 24,
    penalty: "First night",
    noShow: "Full stay",
    bookingCutoffHours: 2,
    latestBookingTime: "18:00",
    maxAdvanceDays: 365,
    minStay: 1,
    maxStay: 30,
    baseGuests: roomPeople(room) || 2,
    singleGuestDiscount: 0,
    extraAdult: 0,
    extraChild: 0,
    closedArrival: false,
    closedDeparture: false,
    includesTaxes: "Yes",
    templateKey: "custom",
    basePlanId: null,
    minAdvanceDays: 0,
    valueAddIds: [],
  };
}

/** The chips under a plan title (prototype's `.plan-meta`). */
export function planMetaChips(plan) {
  const chips = [
    `Book ≥ ${plan.bookingCutoffHours ?? 0}h ahead`,
    `${plan.minStay || 1}–${plan.maxStay || 30} nights`,
  ];
  if (plan.freeCancellationHours && plan.cancellation === "Free cancellation") {
    chips.push(`Cancel ≥ ${plan.freeCancellationHours}h ahead`);
  } else {
    chips.push(plan.cancellation || "Free cancellation");
  }
  return chips;
}
