import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { DoorOpen, ListChecks, SignOut, Star, XCircle } from "@/features/stays/icons";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { DashboardHappeningToday } from "@/types/stays";

type Metric = {
  key: keyof DashboardHappeningToday;
  label: string;
  to: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

const METRICS: Metric[] = [
  { key: "reservations", label: "Reservations", to: "/stays/bookings", Icon: ListChecks },
  { key: "arrivals", label: "Arrivals", to: "/stays/bookings", Icon: DoorOpen },
  { key: "departures", label: "Departures", to: "/stays/bookings", Icon: SignOut },
  { key: "reviews", label: "Reviews", to: "/stays/reviews", Icon: Star },
  { key: "cancellations", label: "Cancellations", to: "/stays/cancellation", Icon: XCircle },
];

/**
 * The "Happening today" block: a section heading above its own white stats
 * card, matching the reference layout.
 */
export default function HappeningToday({
  data,
  canOpen,
}: {
  data: DashboardHappeningToday;
  canOpen: (path: string) => boolean;
}) {
  return (
    <section aria-labelledby="happening-today" className="space-y-5">
      <h2 id="happening-today" className="text-h2 font-bold text-ink">
        Happening today
      </h2>

      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-hairline md:grid-cols-5">
          {METRICS.map(({ key, label, to, Icon }, index) => {
            const value = Number(data[key] ?? 0);
            const cellClass = cn(
              "group flex min-h-28 flex-col items-start gap-1.5 bg-surface p-4 text-left sm:p-5 md:min-h-44",
              index === METRICS.length - 1 && "col-span-2 md:col-span-1",
            );
            const content = (
              <>
                <Icon size={20} className="text-muted" aria-hidden="true" />
                <span className="figures mt-1 text-2xl font-bold text-ink">{value.toLocaleString("en-US")}</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    canOpen(to) ? "text-brand-ink group-hover:underline" : "text-body",
                  )}
                >
                  {label}
                </span>
              </>
            );

            return canOpen(to) ? (
              <Link
                key={key}
                to={to}
                className={cn(
                  cellClass,
                  "transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
              >
                {content}
              </Link>
            ) : (
              <div key={key} className={cellClass}>
                {content}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
