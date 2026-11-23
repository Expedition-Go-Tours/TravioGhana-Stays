import { cn } from "@/lib/utils";
import { formatMoney, type MoneyOptions } from "@/lib/money";

export type MoneyProps = MoneyOptions & {
  amount: unknown;
  currency?: string | null;
  className?: string;
};

/**
 * An amount in the shared format, in tabular figures so columns line up.
 * Compact amounts ($12.4K) keep the full value in the tooltip and in what
 * screen readers announce.
 */
export function Money({ amount, compact = false, className }: MoneyProps) {
  const full = formatMoney(amount, "USD");
  if (!compact) {
    return <span className={cn("figures whitespace-nowrap", className)}>{full}</span>;
  }
  return (
    <span className={cn("figures whitespace-nowrap", className)} title={full} aria-label={full}>
      <span aria-hidden="true">{formatMoney(amount, "USD", { compact: true })}</span>
    </span>
  );
}
