import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui";
import { Buildings } from "@/features/stays/icons";
import StaysCard from "../StaysCard";
import { listProperties, STAYS_KEYS } from "../../api";

export type PromotionReviewRow = { label: string; value: ReactNode };

export type PromotionReviewSection = {
  title: string;
  rows: PromotionReviewRow[];
  onEdit?: () => void;
};

/** Shared final review step for every promotion flow. */
export default function PromotionReviewStep({
  sections,
  selectedPropertyIds,
  onEditProperties,
  onBack,
  onCreate,
  createLabel = "Create promotion",
  title = "Check and confirm",
}: {
  sections: PromotionReviewSection[];
  selectedPropertyIds: string[];
  onEditProperties: () => void;
  onBack: () => void;
  onCreate: () => void;
  createLabel?: string;
  title?: string;
}) {
  const { data: properties = [] } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 30_000,
  });
  const selected = selectedPropertyIds
    .map((id) => properties.find((property) => property.id === id))
    .filter((property): property is NonNullable<typeof property> => Boolean(property));

  return (
    <div className="space-y-5">
      <StaysCard className="rounded-md shadow-none">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/80 sm:text-base">
          Review the details below. You can edit any section before creating the promotion.
        </p>

        <div className="mt-5 space-y-5">
          {sections.map((section) => (
            <section key={section.title}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-ink">{section.title}</h3>
                {section.onEdit && (
                  <button
                    type="button"
                    onClick={section.onEdit}
                    className="shrink-0 text-sm font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Edit
                  </button>
                )}
              </div>
              <dl className="mt-2 rounded-md border border-hairline px-4">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-0.5 border-b border-hairline py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{row.label}</dt>
                    <dd className="text-sm leading-relaxed text-ink sm:max-w-[70%] sm:text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </StaysCard>

      <StaysCard className="rounded-md shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Properties</h2>
            <p className="mt-1 text-sm text-muted">
              {selected.length} propert{selected.length === 1 ? "y" : "ies"} selected
            </p>
          </div>
          <button
            type="button"
            onClick={onEditProperties}
            className="shrink-0 text-sm font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Edit
          </button>
        </div>
        {selected.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {selected.map((property) => (
              <li
                key={property.id}
                className="flex items-center gap-3 rounded-md border border-hairline bg-surface-soft/40 px-3 py-2.5"
              >
                <Buildings size={18} className="shrink-0 text-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{property.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[property.city, property.region, property.id].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No properties selected.</p>
        )}
      </StaysCard>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/stays/special-offers">Cancel</Link>
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" onClick={onBack} className="w-full sm:w-auto">
            Back
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onCreate}
            disabled={selected.length === 0}
            className="w-full disabled:bg-surface-strong disabled:text-muted disabled:opacity-100 disabled:shadow-none sm:w-auto"
          >
            {createLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
