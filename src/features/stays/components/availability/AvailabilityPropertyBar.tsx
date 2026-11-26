import type { ReactNode } from "react";
import StaysCard from "../StaysCard";
import StaysPropertySelect from "../StaysPropertySelect";

/**
 * The property switcher shared by every Availability section. Keeping it in
 * one place means the property context, label and mobile layout never drift
 * between the calendar and the bulk tools.
 */
export default function AvailabilityPropertyBar({
  properties,
  property,
  onSelect,
  children,
}: {
  properties: { id: string; name: string }[];
  property: { id: string; name: string } | null;
  onSelect: (id: string) => void;
  children?: ReactNode;
}) {
  return (
    <StaysCard className="mb-4 rounded-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 sm:w-72">
          <span className="mb-1.5 block text-caption font-semibold text-muted">Property</span>
          <StaysPropertySelect properties={properties} value={property?.id} onChange={onSelect} />
        </label>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </StaysCard>
  );
}
