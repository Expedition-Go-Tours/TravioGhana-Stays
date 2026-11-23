import { NativeSelect } from "@/components/ui";
import {
  DASHBOARD_COLUMNS,
  PROPERTY_STATUS_FILTERS,
  type DashboardColumnKey,
  type DashboardDensity,
  type PropertyStatusFilter,
} from "./dashboardModel";
import DashboardViewControls from "./DashboardViewControls";

/**
 * The status filter and table actions above the Operations table. Like the
 * reference, this row sits on the page background rather than inside a card.
 */
export default function OperationsToolbar({
  status,
  onStatusChange,
  hiddenColumns,
  onToggleColumn,
  density,
  onDensityChange,
  onDownload,
  canDownload,
}: {
  status: PropertyStatusFilter;
  onStatusChange: (value: PropertyStatusFilter) => void;
  hiddenColumns: DashboardColumnKey[];
  onToggleColumn: (key: DashboardColumnKey) => void;
  density: DashboardDensity;
  onDensityChange: (value: DashboardDensity) => void;
  onDownload: () => void;
  canDownload: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <label htmlFor="dashboard-status" className="mb-1.5 block text-caption font-semibold text-muted">
          Filter by status
        </label>
        <NativeSelect
          id="dashboard-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as PropertyStatusFilter)}
          className="h-9 w-48 text-sm"
        >
          {PROPERTY_STATUS_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All properties" : option}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <DashboardViewControls
          columns={DASHBOARD_COLUMNS}
          hiddenColumns={hiddenColumns}
          onToggleColumn={onToggleColumn}
          density={density}
          onDensityChange={onDensityChange}
          onDownload={onDownload}
          canDownload={canDownload}
        />
      </div>
    </div>
  );
}
