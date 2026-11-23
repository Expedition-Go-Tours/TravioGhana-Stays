/**
 * Money formatting — one standard for the whole dashboard.
 *
 * Uses the platform's `Intl.NumberFormat` currency style with the `en-US`
 * locale, so amounts read the way international audiences expect:
 *
 *   formatMoney(1250)          → "$1,250.00"
 *   formatMoney(1250, "EUR")   → "€1,250.00"
 *   formatMoney(1250, "EUR")   → "€1,250.00"
 *   formatMoney(12400, "USD", { compact: true }) → "$12.4K"
 *
 * USD is the default and the fallback. A record that carries its own currency
 * is always shown in that currency — amounts are never converted.
 */
export const DEFAULT_CURRENCY = "USD";
const LOCALE = "en-US";

export type MoneyOptions = {
  /** Short form for KPI tiles: $12.4K, $1.2M. Show the full amount alongside (title / aria-label). */
  compact?: boolean;
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}|${compact}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** A valid ISO 4217 code, upper-cased; anything else becomes the default. */
export function normalizeCurrency(currency: unknown): string {
  if (typeof currency !== "string") return DEFAULT_CURRENCY;
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return DEFAULT_CURRENCY;
  try {
    formatterFor(code, false);
    return code;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/** Amounts arrive as numbers or decimal strings ("29.00"); junk counts as 0. */
export function toAmount(amount: unknown): number {
  const value = typeof amount === "string" ? Number(amount.replace(/,/g, "")) : Number(amount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function formatMoney(amount: unknown, currency: unknown = DEFAULT_CURRENCY, options: MoneyOptions = {}): string {
  return formatterFor(normalizeCurrency(currency), Boolean(options.compact)).format(toAmount(amount));
}
