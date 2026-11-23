import { Button, Input, NativeSelect } from "@/components/ui";
import { Search } from "@/features/stays/icons";
import type { DashboardLocationOption } from "./dashboardModel";

/**
 * The location / property search / reset row above the operations panel.
 * Labels are visible, so the controls still make sense on phones where the
 * layout stacks.
 */
export default function DashboardFilters({
  locations,
  location,
  query,
  hasFilters,
  onLocationChange,
  onQueryChange,
  onReset,
}: {
  locations: DashboardLocationOption[];
  location: string;
  query: string;
  hasFilters: boolean;
  onLocationChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 sm:w-56">
        <label htmlFor="dashboard-location" className="mb-1.5 block text-caption font-semibold text-muted">
          Filter by location
        </label>
        <NativeSelect
          id="dashboard-location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
        >
          {locations.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="min-w-0 sm:min-w-64 sm:max-w-sm sm:flex-1">
        <label htmlFor="dashboard-search" className="mb-1.5 block text-caption font-semibold text-muted">
          Filter by property ID or name
        </label>
        <Input
          id="dashboard-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search properties"
          leading={<Search size={16} aria-hidden="true" />}
        />
      </div>

      <Button variant="secondary" onClick={onReset} disabled={!hasFilters} className="w-full sm:w-auto">
        Reset filters
      </Button>
    </div>
  );
}
