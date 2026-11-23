import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Lightbulb } from "@/features/stays/icons";
import { Card, Money } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { DashboardPerformanceMetrics } from "@/types/stays";
import { formatDecimal, formatPercent, percentChange } from "./performanceModel";

type MetricKey = keyof Pick<
  DashboardPerformanceMetrics,
  | "bookedAvgDailyRate"
  | "stayedAvgDailyRate"
  | "cancellationRate"
  | "stayedRoomNights"
  | "stayedEarnings"
  | "avgBookingWindow"
  | "avgLengthOfStay"
  | "openProperties"
>;

const METRICS: { key: MetricKey; label: string; kind: "money" | "percent" | "number" | "open"; invert?: boolean; suffix?: string }[] = [
  { key: "bookedAvgDailyRate", label: "Booked avg. daily rate", kind: "money" },
  { key: "stayedAvgDailyRate", label: "Stayed avg. daily rate", kind: "money" },
  { key: "cancellationRate", label: "Cancellation rate", kind: "percent", invert: true },
  { key: "stayedRoomNights", label: "Stayed room nights", kind: "number" },
  { key: "stayedEarnings", label: "Stayed earnings", kind: "money" },
  { key: "avgBookingWindow", label: "Avg. booking window", kind: "number", suffix: "days" },
  { key: "avgLengthOfStay", label: "Avg. length of stay", kind: "number", suffix: "nights" },
  { key: "openProperties", label: "Open / Bookable", kind: "open" },
];

function Delta({
  current,
  previous,
  invert,
  compareLabel,
}: {
  current: number;
  previous: number | null | undefined;
  invert?: boolean;
  compareLabel?: string;
}) {
  const change = percentChange(current, previous);
  if (change == null) return null;
  const up = change >= 0;
  const good = invert ? change <= 0 : change >= 0;
  return (
    <p className={cn("mt-1 inline-flex items-center gap-0.5 text-caption font-semibold", good ? "text-success" : "text-danger")}>
      {up ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
      <span>
        {Math.abs(change).toLocaleString("en-US", { maximumFractionDigits: 1 })}%
      </span>
      <span className="font-normal text-muted">
        vs {compareLabel && compareLabel !== "No comparison" ? compareLabel.toLowerCase() : "previous"}
      </span>
    </p>
  );
}

/**
 * The eight figure card at the top of the Performance tab. Money uses the
 * shared Money component; the Open / Bookable tile keeps Booking.com's
 * "x/y properties" reading.
 */
export default function PerformanceSummary({
  summary,
  previous,
  currency,
  periodLabel,
  comparisonLabel,
  opportunityHref,
}: {
  summary: DashboardPerformanceMetrics;
  previous?: DashboardPerformanceMetrics;
  currency: string;
  periodLabel: string;
  comparisonLabel: string;
  opportunityHref: string;
}) {
  return (
    <Card as="section" padding="none" aria-labelledby="performance-summary" className="overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-5 pb-2 pt-4">
        <h2 id="performance-summary" className="text-h3 font-bold text-ink">
          Your overall performance
        </h2>
        <span className="text-caption font-medium text-muted">
          {periodLabel}
          {comparisonLabel && comparisonLabel !== "No comparison" ? ` · ${comparisonLabel}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-hairline bg-hairline xl:grid-cols-4">
        {METRICS.map((metric) => {
          const value = Number(summary[metric.key] ?? 0);
          const previousValue = previous?.[metric.key];
          const suffix =
            metric.suffix === "days"
              ? value === 1
                ? "day"
                : "days"
              : metric.suffix === "nights"
                ? value === 1
                  ? "night"
                  : "nights"
                : metric.suffix;
          return (
            <div key={metric.key} className="bg-surface p-3">
              <p className="text-sm font-semibold text-muted">{metric.label}</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                {metric.kind === "money" ? (
                  <Money amount={value} currency={currency} className="text-2xl font-bold text-ink" />
                ) : (
                  <span className="figures text-2xl font-bold text-ink">
                    {metric.kind === "percent"
                      ? formatPercent(value)
                      : metric.kind === "open"
                        ? `${summary.openProperties}/${summary.totalProperties}`
                        : formatDecimal(value)}
                  </span>
                )}
                {suffix && <span className="text-caption text-muted">{suffix}</span>}
              </div>
              {metric.kind === "open" ? (
                <p className="mt-1 text-caption text-muted">properties in this group</p>
              ) : (
                <Delta
                  current={value}
                  previous={previousValue}
                  invert={metric.invert}
                  compareLabel={comparisonLabel}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline bg-surface-soft px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-body">
          <Lightbulb size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-accent-ink" />
          <span>We&apos;ve identified a number of opportunities for you to boost business in the coming week.</span>
        </p>
        <Link
          to={opportunityHref}
          className="shrink-0 text-sm font-semibold text-brand-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Get started
        </Link>
      </div>
    </Card>
  );
}
