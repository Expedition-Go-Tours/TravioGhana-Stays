import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaysPageHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * The standard page heading: display-face title, a supporting line, and the
 * page's actions on the right (below the title on phones).
 */
export default function StaysPageHeader({ title, subtitle, actions, className }: StaysPageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[1.375rem] leading-8 font-bold tracking-tight text-ink sm:text-h1">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-body">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
