import type { ReactNode } from "react";
import { Info } from "@/features/stays/icons";

/** Flat amber informational box used across the Availability bulk tools. */
export default function AvailabilityNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-soft px-4 py-3.5 text-sm leading-relaxed text-ink"
    >
      <Info size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
