import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaysPageHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * The dashboard's standard page heading.
 *
 * Display type sits at 600 with tight tracking — the editorial calm of the
 * design system, but with enough weight to hold its own above a dense table.
 * (The reference doc's 400 is a marketing voice; see README.)
 */
export default function StaysPageHeader({ title, subtitle, actions, className }: StaysPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-body">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
