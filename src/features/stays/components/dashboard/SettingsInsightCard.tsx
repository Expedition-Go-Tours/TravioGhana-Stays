import { Link } from "react-router-dom";
import { Card } from "@/components/ui";
import { ChartLine } from "@/features/stays/icons";

/** The insight card above the Settings table. */
export default function SettingsInsightCard({ canOpenInsights }: { canOpenInsights: boolean }) {
  return (
    <Card className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"
      >
        <ChartLine size={20} />
      </span>
      <div className="min-w-0">
        <h2 className="text-h3 font-bold text-ink">Strengthen your offering by understanding guest demand</h2>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted">
          We know what guests are looking for (and when) and we can help you deliver it. With insights into guest
          demand, you can tailor your property settings and calendar to take advantage of trends for your area.
        </p>
        {canOpenInsights && (
          <Link
            to="/stays/analytics"
            className="mt-3 inline-flex text-sm font-semibold text-brand-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go to insights
          </Link>
        )}
      </div>
    </Card>
  );
}
