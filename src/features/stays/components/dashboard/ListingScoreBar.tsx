import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TONE_CLASSES } from "@/lib/statusTones";
import { listingScoreTone } from "./settingsModel";

/**
 * The listing completeness bar. "Improve" is deliberately not a link yet —
 * the property quality page is still to be designed.
 */
export default function ListingScoreBar({ score }: { score: number }) {
  const tone = listingScoreTone(score);
  return (
    <Tooltip content="Improving the listing page is coming next.">
      <span tabIndex={0} className="block w-28 cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center justify-between gap-2 text-caption">
          <span className="figures font-semibold text-ink">{score}%</span>
          <span className="text-muted">Improve</span>
        </span>
        <span
          role="progressbar"
          aria-label="Listing score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          className="mt-1 block h-1.5 rounded-full bg-surface-strong"
        >
          <span className={cn("block h-full rounded-full", TONE_CLASSES[tone].dot)} style={{ width: `${score}%` }} />
        </span>
      </span>
    </Tooltip>
  );
}
