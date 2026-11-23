import { useState } from "react";
import { toast } from "sonner";
import { Card, IconButton } from "@/components/ui";
import { ThumbsDown, ThumbsUp } from "@/features/stays/icons";
import { cn } from "@/lib/utils";
import type { DashboardViewKey } from "./dashboardModel";

type Feedback = "up" | "down" | null;

const FEEDBACK_PREFIX = "stays.dashboard.feedback.v2.";

function feedbackKey(view: DashboardViewKey) {
  return `${FEEDBACK_PREFIX}${view}`;
}

function readFeedback(view: DashboardViewKey): Feedback {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(feedbackKey(view));
    return value === "up" || value === "down" ? value : null;
  } catch {
    return null;
  }
}

function persistFeedback(view: DashboardViewKey, value: Feedback) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(feedbackKey(view), value);
    else window.localStorage.removeItem(feedbackKey(view));
  } catch {
    // The answer still shows for this session if storage is unavailable.
  }
}

/**
 * The feedback prompt below each dashboard table. It is its own card, as in
 * the reference, and keeps the answer locally per tab.
 */
export default function DashboardFeedback({ view }: { view: DashboardViewKey }) {
  const [feedback, setFeedback] = useState<Feedback>(() => readFeedback(view));

  const choose = (next: Exclude<Feedback, null>) => {
    setFeedback(next);
    persistFeedback(view, next);
    toast.success("Thanks for your feedback.");
  };

  return (
    <Card padding="none" className="px-5 py-3">
      <div className="flex flex-col gap-3 rounded-control border border-hairline bg-surface-soft px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-body">Your feedback is important to us. Was this data helpful?</p>
        <div role="group" aria-label="Was this data helpful?" className="flex shrink-0 items-center gap-1">
          <IconButton
            variant={feedback === "up" ? "secondary" : "ghost"}
            size="iconSm"
            aria-label="Yes, this was helpful"
            aria-pressed={feedback === "up"}
            onClick={() => choose("up")}
            className={cn(feedback === "up" && "text-success")}
          >
            <ThumbsUp size={16} weight={feedback === "up" ? "fill" : "regular"} />
          </IconButton>
          <IconButton
            variant={feedback === "down" ? "secondary" : "ghost"}
            size="iconSm"
            aria-label="No, this was not helpful"
            aria-pressed={feedback === "down"}
            onClick={() => choose("down")}
            className={cn(feedback === "down" && "text-danger")}
          >
            <ThumbsDown size={16} weight={feedback === "down" ? "fill" : "regular"} />
          </IconButton>
        </div>
      </div>
      {feedback && (
        <p className="mt-2 text-caption text-muted" role="status">
          Thanks — we&apos;ve noted your answer.
        </p>
      )}
    </Card>
  );
}
