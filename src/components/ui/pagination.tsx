import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "@/features/stays/icons";
import { Button } from "./button";

export type PaginationProps = {
  page: number;
  totalPages: number;
  totalCount?: number | null;
  onPageChange: (page: number) => void;
  /** Noun for the count, e.g. "bookings". */
  itemLabel?: string;
  className?: string;
};

/** Previous / next with "Page 2 of 5". Renders nothing for a single page. */
export function Pagination({ page, totalPages, totalCount, onPageChange, itemLabel = "results", className }: PaginationProps) {
  if (!totalPages || totalPages <= 1) return null;
  const current = Math.min(Math.max(1, page), totalPages);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-between gap-3 px-1 py-3", className)}>
      <p className="text-sm text-muted" aria-live="polite">
        Page <span className="figures font-semibold text-ink">{current}</span> of{" "}
        <span className="figures font-semibold text-ink">{totalPages}</span>
        {totalCount != null && (
          <span className="hidden sm:inline">
            {" "}
            · <span className="figures">{totalCount.toLocaleString("en-US")}</span> {itemLabel}
          </span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button size="md" disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button size="md" disabled={current >= totalPages} onClick={() => onPageChange(current + 1)} aria-label="Next page">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </nav>
  );
}
