import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import StaysCard from "../components/StaysCard";
import { PROMOTIONS, type PromotionCard } from "../config/promotions";
import { Trash2 } from "@/features/stays/icons";

function PromotionCopy({ promotion }: { promotion: PromotionCard }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-xl font-bold text-ink">{promotion.title}</h2>
        {promotion.isNew && (
          <span className="rounded-[3px] bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">New</span>
        )}
      </div>
      <p className="mt-2 max-w-[46rem] text-sm leading-relaxed text-ink/80 sm:text-base">
        {promotion.description}
      </p>
      {promotion.removable && (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <Trash2 size={15} aria-hidden="true" />
          Remove in bulk
        </button>
      )}
    </div>
  );
}

function PromotionMeta({ promotion }: { promotion: PromotionCard }) {
  if (!promotion.meta) return null;
  return (
    <div className="grid gap-1 text-sm leading-relaxed text-ink/80 sm:text-base">
      {promotion.meta.bookDates && (
        <p>
          <span className="font-semibold text-ink">Book dates:</span> {promotion.meta.bookDates}
        </p>
      )}
      {promotion.meta.stayDates && (
        <p>
          <span className="font-semibold text-ink">Stay dates:</span> {promotion.meta.stayDates}
        </p>
      )}
      {promotion.meta.discount && (
        <p>
          <span className="font-semibold text-ink">Discount:</span> {promotion.meta.discount}
        </p>
      )}
    </div>
  );
}

function PromotionRow({ promotion }: { promotion: PromotionCard }) {
  const withMeta = Boolean(promotion.meta);
  return (
    <StaysCard
      className={`rounded-md shadow-none ${
        withMeta
          ? "lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)_auto] lg:items-center lg:gap-8"
          : "lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8"
      }`}
    >
      <PromotionCopy promotion={promotion} />
      {withMeta && <PromotionMeta promotion={promotion} />}
      <div className="mt-4 lg:mt-0 lg:justify-self-end">
        {promotion.to ? (
          <Button asChild variant="secondary" className="w-full sm:w-auto lg:min-w-[14rem]">
            <Link to={promotion.to}>Take action</Link>
          </Button>
        ) : (
          <Button type="button" variant="secondary" className="w-full sm:w-auto lg:min-w-[14rem]">
            Take action
          </Button>
        )}
      </div>
    </StaysCard>
  );
}

/**
 * Special Offers landing page — a catalogue of the promotions a property can
 * join. Each Take action button is intentionally inert until its dedicated
 * promotion flow is added.
 */
export default function StaysOffersPage() {
  return (
    <div>
      <h1 className="mb-4 text-[1.5rem] font-bold tracking-tight text-ink sm:text-3xl">Special Offers</h1>
      <div className="space-y-5">
        {PROMOTIONS.map((promotion) => (
          <PromotionRow key={promotion.key} promotion={promotion} />
        ))}
      </div>
    </div>
  );
}
