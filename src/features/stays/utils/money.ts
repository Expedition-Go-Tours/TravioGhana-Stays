/**
 * Stays money formatting — every price in the workspace is USD.
 *
 * The generic formatter in `lib/money.ts` still supports other currencies for
 * reusable UI, but Stays components always call this wrapper so a stray
 * non-USD value from an API payload can never leak into the interface.
 */
import { formatMoney as format, DEFAULT_CURRENCY, type MoneyOptions } from "@/lib/money";

export const STAYS_CURRENCY = "USD";

export function formatMoney(amount: unknown, _currency?: unknown, options: MoneyOptions = {}): string {
  return format(amount, STAYS_CURRENCY, options);
}

export { DEFAULT_CURRENCY };
