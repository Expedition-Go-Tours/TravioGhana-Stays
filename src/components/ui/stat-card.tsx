import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "@/features/stays/icons";
import { TONE_CLASSES, type Tone } from "@/lib/statusTones";
import { Card } from "./card";

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Supporting line under the value. */
  hint?: ReactNode;
  icon?: ReactNode;
  /** Colour of the icon tile. */
  tone?: Tone;
  /** Change versus a previous period, in percent (e.g. 12 or -4.5). */
  change?: number | null;
  /** What `change` compares against, e.g. "vs last month". */
  changeLabel?: string;
  className?: string;
};

/**
 * KPI tile: label, a large figure, and an optional change indicator. The
 * figure uses the display face with tabular numerals.
 */
export function StatCard({ label, value, hint, icon, tone = "brand", change, changeLabel, className }: StatCardProps) {
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const up = hasChange && (change as number) >= 0;

  return (
    <Card padding="none" className={cn("@container flex min-w-0 flex-col gap-3 p-4 sm:p-5", className)}>
      {/* Narrow tiles (phones, four-up grids) put the icon above the label so the label stays on one line. */}
      <div className="flex flex-col-reverse items-start gap-2 @[15rem]:flex-row @[15rem]:justify-between @[15rem]:gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONE_CLASSES[tone].chip)}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="figures truncate text-2xl font-bold text-ink sm:text-[1.75rem] sm:leading-9">{value}</p>
        {(hasChange || hint) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-muted">
            {hasChange && (
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", up ? "text-success" : "text-danger")}>
                {up ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                <span className="sr-only">{up ? "Up" : "Down"}</span>
                {Math.abs(change as number).toLocaleString("en-US", { maximumFractionDigits: 1 })}%
                {changeLabel && <span className="font-normal text-muted"> {changeLabel}</span>}
              </span>
            )}
            {hint && <span className="min-w-0">{hint}</span>}
          </p>
        )}
      </div>
    </Card>
  );
}
