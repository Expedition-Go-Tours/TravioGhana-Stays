import type { ReactNode } from "react";
import { DataTable, EmptyState, Money, ScoreBadge, Tooltip, type DataColumn } from "@/components/ui";
import { Buildings, Info } from "@/features/stays/icons";
import type { DashboardPerformanceProperty } from "@/types/stays";
import DashboardPropertyIdentity from "./DashboardPropertyIdentity";
import type { DashboardDensity } from "./dashboardModel";
import {
  PERFORMANCE_COLUMNS,
  formatDecimal,
  formatPercent,
  type PerformanceColumnKey,
} from "./performanceModel";

const TRACKING_HINT = "Storefront analytics are not connected yet. This will show once click-through and conversion tracking is live.";

function ReviewScore({ row }: { row: DashboardPerformanceProperty }) {
  if (row.reviewScore == null) {
    return (
      <Tooltip content="There are no reviews for this time period.">
        <span
          tabIndex={0}
          className="cursor-help whitespace-nowrap rounded-sm text-caption text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          No reviews
        </span>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <ScoreBadge score={row.reviewScore} reviewCount={row.reviewCount} size="sm" compact />
      <span className="whitespace-nowrap text-caption text-muted">
        {row.reviewCount} {row.reviewCount === 1 ? "review" : "reviews"}
      </span>
    </span>
  );
}

function NumberCell({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <span className="figures tabular-nums text-ink">
      {formatDecimal(value)}
      {suffix && <span className="ml-0.5 text-caption font-normal text-muted">{suffix}</span>}
    </span>
  );
}

function TrackingCell() {
  return (
    <Tooltip content={TRACKING_HINT}>
      <span tabIndex={0} className="cursor-help rounded-sm text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        —
      </span>
    </Tooltip>
  );
}

function TrackingHeader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip content={TRACKING_HINT}>
        <span tabIndex={0} aria-label={`About ${label}`} role="img" className="cursor-help rounded-full">
          <Info size={13} aria-hidden="true" className="text-subtle" />
        </span>
      </Tooltip>
    </span>
  );
}

function PhoneCard({ row, currency, canOpen }: { row: DashboardPerformanceProperty; currency: string; canOpen: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <DashboardPropertyIdentity row={row} canOpen={canOpen} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 text-sm">
        <div>
          <dt className="text-caption font-semibold text-muted">Booked ADR</dt>
          <dd><Money amount={row.bookedAvgDailyRate} currency={currency} /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Stayed ADR</dt>
          <dd><Money amount={row.stayedAvgDailyRate} currency={currency} /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Cancellation rate</dt>
          <dd className="figures">{formatPercent(row.cancellationRate)}</dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Stayed room nights</dt>
          <dd className="figures">{row.stayedRoomNights}</dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Stayed earnings</dt>
          <dd><Money amount={row.stayedEarnings} currency={currency} /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Reservations</dt>
          <dd className="figures">{row.reservations}</dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Click-through (30d)</dt>
          <dd className="text-muted" title={TRACKING_HINT}>—</dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Conversion (30d)</dt>
          <dd className="text-muted" title={TRACKING_HINT}>—</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-caption font-semibold text-muted">Review score</dt>
          <dd className="mt-1"><ReviewScore row={row} /></dd>
        </div>
      </dl>
    </div>
  );
}

export default function PerformanceTable({
  rows,
  hiddenColumns,
  density,
  currency,
  canOpenProperty,
}: {
  rows: DashboardPerformanceProperty[];
  hiddenColumns: PerformanceColumnKey[];
  density: DashboardDensity;
  currency: string;
  canOpenProperty: boolean;
}) {
  const cellByKey: Record<PerformanceColumnKey, DataColumn<DashboardPerformanceProperty>["cell"]> = {
    property: (row) => <DashboardPropertyIdentity row={row} canOpen={canOpenProperty} />,
    bookedAvgDailyRate: (row) => <Money amount={row.bookedAvgDailyRate} currency={currency} />,
    stayedAvgDailyRate: (row) => <Money amount={row.stayedAvgDailyRate} currency={currency} />,
    cancellationRate: (row) => <span className="figures tabular-nums">{formatPercent(row.cancellationRate)}</span>,
    stayedRoomNights: (row) => <NumberCell value={row.stayedRoomNights} />,
    stayedEarnings: (row) => <Money amount={row.stayedEarnings} currency={currency} />,
    reviewScore: (row) => <ReviewScore row={row} />,
    reservations: (row) => <NumberCell value={row.reservations} />,
    clickThroughRate: () => <TrackingCell />,
    conversionRate: () => <TrackingCell />,
  };

  const headerByKey: Partial<Record<PerformanceColumnKey, ReactNode>> = {
    clickThroughRate: <TrackingHeader label="Click-through rate (30 days)" />,
    conversionRate: <TrackingHeader label="Conversion (30 days)" />,
  };

  const columns: DataColumn<DashboardPerformanceProperty>[] = PERFORMANCE_COLUMNS.filter(
    (column) => !hiddenColumns.includes(column.key),
  ).map((column) => ({
    key: column.key,
    header: headerByKey[column.key] ?? column.label,
    cell: cellByKey[column.key],
    sortable: column.key === "property",
    sortValue: column.key === "property" ? (row) => row.name : undefined,
  }));

  return (
    <DataTable
      ariaLabel="Property performance"
      columns={columns}
      rows={rows}
      density={density}
      getRowKey={(row) => row.id}
      renderCard={(row) => <PhoneCard row={row} currency={currency} canOpen={canOpenProperty} />}
      empty={
        <EmptyState
          compact
          icon={<Buildings size={22} />}
          title="No properties match"
          description="Try another location or search."
        />
      }
    />
  );
}
