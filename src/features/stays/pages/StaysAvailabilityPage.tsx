// @ts-nocheck
// Migration marker: split into per-section components; raw section props are not annotated.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import StaysPageHeader from "../components/StaysPageHeader";
import { availabilitySectionFor } from "../config/availabilityNav";
import CalendarSection from "../components/availability/CalendarSection";
import OpenCloseRoomsSection from "../components/availability/OpenCloseRoomsSection";
import CopyRatesSection from "../components/availability/CopyRatesSection";
import RestrictionRulesSection from "../components/availability/RestrictionRulesSection";
import PricingPerGuestSection from "../components/availability/PricingPerGuestSection";
import ChildRatesSection from "../components/availability/ChildRatesSection";
import { ThumbsDown, ThumbsUp } from "../icons";

const SECTIONS = {
  calendar: CalendarSection,
  "open-close-rooms": OpenCloseRoomsSection,
  "copy-rates": CopyRatesSection,
  restrictions: RestrictionRulesSection,
  "pricing-per-guest": PricingPerGuestSection,
  "child-rates": ChildRatesSection,
};

/**
 * The Availability workspace. One route, seven sections switched by
 * `?section=` — the same URL pattern Settings uses, so every section is
 * linkable and the sidebar can highlight the current one.
 */
export default function StaysAvailabilityPage() {
  const [searchParams] = useSearchParams();
  const section = availabilitySectionFor(searchParams.get("section"));
  const Section = SECTIONS[section.slug] || CalendarSection;
  const [helpful, setHelpful] = useState<"up" | "down" | null>(null);
  const pricing = section.slug === "pricing-per-guest";

  return (
    <div>
      {!pricing && (
        <p className="mb-1 text-overline font-bold uppercase tracking-wider text-muted">Availability</p>
      )}
      <StaysPageHeader
        title={section.label}
        subtitle={section.description}
        actions={
          pricing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Do you find this page helpful?</span>
              <button
                type="button"
                aria-label="Yes, this page is helpful"
                aria-pressed={helpful === "up"}
                onClick={() => setHelpful("up")}
                className={`grid h-9 w-9 place-items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  helpful === "up"
                    ? "border-brand bg-brand-soft text-brand-ink"
                    : "border-hairline-strong bg-surface text-muted hover:border-slate-400 hover:text-ink"
                }`}
              >
                <ThumbsUp size={17} />
              </button>
              <button
                type="button"
                aria-label="No, this page is not helpful"
                aria-pressed={helpful === "down"}
                onClick={() => setHelpful("down")}
                className={`grid h-9 w-9 place-items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  helpful === "down"
                    ? "border-brand bg-brand-soft text-brand-ink"
                    : "border-hairline-strong bg-surface text-muted hover:border-slate-400 hover:text-ink"
                }`}
              >
                <ThumbsDown size={17} />
              </button>
            </div>
          ) : undefined
        }
      />
      <Section />
    </div>
  );
}
