import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button, Checkbox, Input } from "@/components/ui";
import { ChevronDown, FileText, X } from "@/features/stays/icons";
import StaysCard from "../StaysCard";
import { listProperties, STAYS_KEYS } from "../../api";

/** Shared "Select properties" step used by every promotion flow. */
export default function SelectPropertiesStep({
  selected,
  onSelectedChange,
  onBack,
  onContinue,
}: {
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  onBack: () => void;
  onContinue?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");
  const { data: properties = [] } = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    staleTime: 30_000,
  });

  const tokens = search.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
  const filtered = tokens.length
    ? properties.filter((property) => {
        const haystack = [
          property.id,
          property.name,
          property.city,
          property.region,
          property.country,
          property.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
    : [];

  const toggle = (id: string) =>
    onSelectedChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  return (
    <div className="space-y-5">
      <StaysCard className="rounded-md p-0 shadow-none">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
        >
          <h2 className="text-xl font-bold text-ink">Select properties to make changes to</h2>
          <ChevronDown
            size={20}
            className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {expanded && (
          <div className="border-t border-hairline px-5 pb-5 pt-4 sm:px-6">
            <div className="rounded-md border border-hairline p-5 sm:p-6">
              <div className="sm:ml-auto sm:max-w-xl">
                <p className="text-sm font-semibold text-ink sm:text-base">Search for properties</p>
                <div className="relative mt-2">
                  <Input
                    aria-label="Search for properties"
                    placeholder="Paste or enter a name, location or multiple property IDs"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label="Clear property search"
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-brand-ink transition-colors hover:text-brand-hover"
                  >
                    <X size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-brand-ink underline-offset-2 hover:underline"
                >
                  How can I paste multiple property IDs?
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 pb-0 pt-6 text-center">
                <FileText size={40} className="text-muted" aria-hidden="true" />
                <p className="text-base text-ink/80">
                  We couldn&apos;t find any properties that match your search
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-1 rounded-md border border-hairline p-2 sm:grid-cols-2">
                {filtered.map((property) => (
                  <Checkbox
                    key={property.id}
                    checked={selected.includes(property.id)}
                    onChange={() => toggle(property.id)}
                    label={property.name}
                    description={[property.city, property.region, property.id].filter(Boolean).join(" · ")}
                  />
                ))}
              </div>
            )}
          </div>
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
            disabled={selected.length === 0}
            onClick={onContinue}
            className="w-full disabled:bg-surface-strong disabled:text-muted disabled:opacity-100 disabled:shadow-none sm:w-auto"
          >
            Check and confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
