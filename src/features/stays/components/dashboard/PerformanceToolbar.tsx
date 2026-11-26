import { Button } from "@/components/ui";
import { StaysSelect } from "../StaysForm";
import type {
  DashboardPerformanceComparison,
  DashboardPerformancePeriod,
} from "@/types/stays";
import type { DashboardDensity } from "./dashboardModel";
import DashboardViewControls from "./DashboardViewControls";
import {
  PERFORMANCE_COLUMNS,
  PERFORMANCE_COMPARISON_OPTIONS,
  PERFORMANCE_PERIOD_OPTIONS,
  type PerformanceColumnKey,
} from "./performanceModel";

export default function PerformanceToolbar({
  period,
  comparison,
  onPeriodChange,
  onComparisonChange,
  onShowData,
  loading,
  hiddenColumns,
  onToggleColumn,
  density,
  onDensityChange,
  onDownload,
  canDownload,
}: {
  period: DashboardPerformancePeriod;
  comparison: DashboardPerformanceComparison;
  onPeriodChange: (value: DashboardPerformancePeriod) => void;
  onComparisonChange: (value: DashboardPerformanceComparison) => void;
  onShowData: () => void;
  loading: boolean;
  hiddenColumns: PerformanceColumnKey[];
  onToggleColumn: (key: PerformanceColumnKey) => void;
  density: DashboardDensity;
  onDensityChange: (density: DashboardDensity) => void;
  onDownload: () => void;
  canDownload: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label htmlFor="performance-period" className="mb-1.5 block text-caption font-semibold text-muted">
            Filter by period
          </label>
          <StaysSelect
            id="performance-period"
            options={PERFORMANCE_PERIOD_OPTIONS}
            value={period}
            onChange={(event) => onPeriodChange(event.target.value as DashboardPerformancePeriod)}
            className="h-9 w-44 text-sm"
          />
        </div>
        <div>
          <label htmlFor="performance-comparison" className="mb-1.5 block text-caption font-semibold text-muted">
            Compare with
          </label>
          <StaysSelect
            id="performance-comparison"
            options={PERFORMANCE_COMPARISON_OPTIONS}
            value={comparison}
            onChange={(event) => onComparisonChange(event.target.value as DashboardPerformanceComparison)}
            className="h-9 w-44 text-sm"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={onShowData} loading={loading} className="h-9">
          Show data
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <DashboardViewControls
          columns={PERFORMANCE_COLUMNS}
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
