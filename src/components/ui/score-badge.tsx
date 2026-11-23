import { cn } from "@/lib/utils";
import { scoreLabel } from "./variants";

/**
 * Booking.com-style review score: a solid square with the score out of 10,
 * then a word label and (optionally) the review count.
 *
 * Reviews in this workspace are rated 1–5 stars; pass `stars` to convert, or
 * `score` when the value is already out of 10.
 */

export type ScoreBadgeProps = {
  score?: number | null;
  stars?: number | null;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  /** Hide the word label (badge only). */
  compact?: boolean;
  className?: string;
};

const SIZES = {
  sm: { box: "h-7 min-w-7 px-1.5 text-caption", label: "text-caption" },
  md: { box: "h-9 min-w-9 px-2 text-sm", label: "text-sm" },
  lg: { box: "h-12 min-w-12 px-2.5 text-lg", label: "text-base" },
};

export function ScoreBadge({ score, stars, reviewCount, size = "md", compact = false, className }: ScoreBadgeProps) {
  const raw = score ?? (stars != null ? stars * 2 : null);
  if (raw == null || !Number.isFinite(raw)) return null;
  const value = Math.min(10, Math.max(0, raw));
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const label = scoreLabel(value);
  const sizes = SIZES[size];

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`Scored ${display} out of 10, ${label}${reviewCount != null ? `, ${reviewCount} reviews` : ""}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "figures inline-flex items-center justify-center rounded-lg rounded-bl-none bg-brand font-bold text-on-brand",
          sizes.box,
        )}
      >
        {display}
      </span>
      {!compact && (
        <span aria-hidden="true" className="flex flex-col leading-tight">
          <span className={cn("font-semibold text-ink", sizes.label)}>{label}</span>
          {reviewCount != null && (
            <span className="text-caption text-muted">
              {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
