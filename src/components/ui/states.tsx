import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, RefreshCw, Inbox } from "@/features/stays/icons";
import { Button } from "./button";

type StateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Tighter spacing for use inside a card section. */
  compact?: boolean;
};

function StateFrame({ icon, title, description, action, className, compact, tone }: StateProps & { tone: "neutral" | "danger" }) {
  return (
    <div className={cn("flex flex-col items-center px-4 text-center", compact ? "py-8" : "py-12", className)}>
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-strong text-muted",
          )}
        >
          {icon}
        </span>
      )}
      <p className="text-h3 font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Nothing here yet — say why, and offer the next step. */
export function EmptyState({ icon = <Inbox size={22} />, ...props }: StateProps) {
  return <StateFrame icon={icon} tone="neutral" {...props} />;
}

/**
 * A request failed. Distinct from an empty state, so a failure never looks
 * like "you have no bookings".
 */
export function ErrorState({
  title = "We couldn't load this",
  description = "Check your connection and try again.",
  onRetry,
  retrying = false,
  compact,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div role="alert" className={className}>
      <StateFrame
        tone="danger"
        compact={compact}
        icon={<AlertTriangle size={22} />}
        title={title}
        description={description}
        action={
          onRetry && (
            <Button onClick={onRetry} loading={retrying}>
              {!retrying && <RefreshCw size={16} />}
              Try again
            </Button>
          )
        }
      />
    </div>
  );
}

/** The backend answered 404/501 — this feature has not been switched on yet. */
export function UnavailableState({ feature, compact, className }: { feature?: string; compact?: boolean; className?: string }) {
  return (
    <div role="status" className={className}>
      <StateFrame
        tone="neutral"
        compact={compact}
        icon={<Clock size={22} />}
        title="This feature isn't available on your account yet"
        description={
          feature
            ? `${feature} will appear here as soon as it's switched on for your account.`
            : "It will appear here as soon as it's switched on for your account."
        }
      />
    </div>
  );
}
