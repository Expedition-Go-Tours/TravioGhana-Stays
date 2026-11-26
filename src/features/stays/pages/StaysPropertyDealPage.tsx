import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import StaysCard from "../components/StaysCard";

const STEPS = ["Settings", "Select properties", "Check and confirm"];

const SETTINGS = [
  ["Deal name", "New Property Deal"],
  ["Discount percentage", "20%"],
  [
    "Number of bookings",
    "The first 3 bookings during the first 90 days will get a 20% discount",
  ],
  ["Rate plans this discount applies to", "All rate plans"],
  ["Rooms this discount applies to", "All rooms"],
  ["How long guests need to stay", "Stay must match rate plan"],
];

/**
 * Step one of the New Property Deal promotion. The remaining steps are added
 * as their reference screens are provided.
 */
export default function StaysPropertyDealPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Create a New Property Deal</h1>

      <ol className="mt-5 flex items-center gap-2 sm:mt-6 sm:gap-4">
        {STEPS.map((step, index) => {
          const active = index === 0;
          return (
            <li
              key={step}
              className={`flex min-w-0 items-center gap-2 ${index === 0 ? "shrink-0" : "flex-1"}`}
            >
              {index > 0 && <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-hairline-strong" />}
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  active
                    ? "bg-brand text-on-brand"
                    : "border border-hairline-strong bg-surface text-muted"
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`truncate text-xs font-semibold sm:text-sm ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <StaysCard className="mt-5 rounded-md p-0 shadow-none sm:mt-6">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">Settings</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/80 sm:text-base">
            Stand out to guests with a 20% discount for the first 3 bookings or 90 days, whichever
            comes first. After that the price will go back to the original price. You can also turn
            the deal off sooner.
          </p>
        </div>
        <dl>
          {SETTINGS.map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 border-b border-hairline px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,18rem)_minmax(0,1fr)] sm:gap-6 sm:px-6 sm:py-5"
            >
              <dt className="text-sm font-semibold text-ink">{label}:</dt>
              <dd className="text-sm leading-relaxed text-ink/80 sm:text-base">{value}</dd>
            </div>
          ))}
        </dl>
      </StaysCard>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/stays/special-offers">Cancel</Link>
        </Button>
        <Button type="button" variant="primary" className="w-full sm:w-auto">
          Select properties
        </Button>
      </div>
    </div>
  );
}
