import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaysStatCardProps = {
  label?: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "emerald" | "amber";
  compact?: boolean;
  className?: string;
};

/**
 * Stat tile: 24px card, hairline border, coloured rail, and the value in the
 * mono face — every number in this dashboard is tabular data, so numerals get
 * the same treatment everywhere.
 */
const ACCENTS = {
  emerald: "border-l-emerald-600",
  amber: "border-l-warn",
};

export default function StaysStatCard({
  label,
  value,
  hint,
  icon,
  accent = "emerald",
  compact = false,
  className,
}: StaysStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-hairline bg-canvas p-4 transition-all border-l-4",
        ACCENTS[accent] || ACCENTS.emerald,
        compact && "py-3.5",
        className,
      )}
    >
      {icon && (
        <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200/60 bg-emerald-50 text-emerald-600">
          {icon}
        </div>
      )}
      <p className="font-mono text-lg font-medium leading-tight tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-body">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
