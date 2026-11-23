import { Badge, DataTable, EmptyState, Tooltip, type DataColumn } from "@/components/ui";
import { Buildings, Clock, Info } from "@/features/stays/icons";
import type { DashboardSettingsProperty } from "@/types/stays";
import DashboardPropertyIdentity from "./DashboardPropertyIdentity";
import ListingScoreBar from "./ListingScoreBar";
import type { DashboardDensity } from "./dashboardModel";
import {
  SETTINGS_COLUMNS,
  eligibleLabel,
  minimumStayLabel,
  type SettingsColumnKey,
} from "./settingsModel";

const RATE_HINT = "Rate setup for this channel is coming in the next pass.";

function RateCell({ active }: { active: boolean }) {
  if (active) {
    return <Badge tone="success" dot>Active</Badge>;
  }
  return (
    <Tooltip content={RATE_HINT}>
      <span tabIndex={0} className="cursor-help rounded-sm text-caption font-semibold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Add now
      </span>
    </Tooltip>
  );
}

function ProgramCell({ eligible, label }: { eligible: boolean; label: string }) {
  if (eligible) return <Badge tone="success" dot>{eligibleLabel(true)}</Badge>;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted">
      {eligibleLabel(false)}
      <Tooltip content={`${label} eligibility is reviewed by Travio.`}>
        <span tabIndex={0} aria-label={`About ${label}`} role="img" className="cursor-help rounded-full">
          <Info size={12} aria-hidden="true" className="text-subtle" />
        </span>
      </Tooltip>
    </span>
  );
}

function PhoneCard({ row, canOpen }: { row: DashboardSettingsProperty; canOpen: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <DashboardPropertyIdentity row={row} canOpen={canOpen} />
        <span className="shrink-0 font-mono text-caption text-muted">{row.id}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 text-sm">
        <div>
          <dt className="text-caption font-semibold text-muted">Travio Rewards</dt>
          <dd className="mt-0.5"><ProgramCell eligible={row.rewardsEligible} label="Travio Rewards" /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Preferred</dt>
          <dd className="mt-0.5"><ProgramCell eligible={row.preferredEligible} label="Preferred" /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Minimum stay</dt>
          <dd className="mt-0.5 flex items-center gap-1 text-ink">
            <Clock size={13} aria-hidden="true" className="text-muted" />
            {minimumStayLabel(row.minimumStay)}
          </dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Local rates</dt>
          <dd className="mt-0.5"><RateCell active={row.localRates} /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Mobile rates</dt>
          <dd className="mt-0.5"><RateCell active={row.mobileRates} /></dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-muted">Listing score</dt>
          <dd className="mt-1"><ListingScoreBar score={row.listingScore} /></dd>
        </div>
      </dl>
    </div>
  );
}

export default function SettingsTable({
  rows,
  hiddenColumns,
  density,
  canOpenProperty,
}: {
  rows: DashboardSettingsProperty[];
  hiddenColumns: SettingsColumnKey[];
  density: DashboardDensity;
  canOpenProperty: boolean;
}) {
  const cellByKey: Record<SettingsColumnKey, DataColumn<DashboardSettingsProperty>["cell"]> = {
    id: (row) => <span className="font-mono text-caption text-muted">{row.id}</span>,
    property: (row) => <DashboardPropertyIdentity row={row} canOpen={canOpenProperty} />,
    rewards: (row) => <ProgramCell eligible={row.rewardsEligible} label="Travio Rewards" />,
    preferred: (row) => <ProgramCell eligible={row.preferredEligible} label="Preferred" />,
    minimumStay: (row) => (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
        <Clock size={14} aria-hidden="true" className="text-muted" />
        {minimumStayLabel(row.minimumStay)}
      </span>
    ),
    localRates: (row) => <RateCell active={row.localRates} />,
    mobileRates: (row) => <RateCell active={row.mobileRates} />,
    listingScore: (row) => <ListingScoreBar score={row.listingScore} />,
  };

  const columns: DataColumn<DashboardSettingsProperty>[] = SETTINGS_COLUMNS.filter(
    (column) => !hiddenColumns.includes(column.key),
  ).map((column) => ({
    key: column.key,
    header: column.label,
    cell: cellByKey[column.key],
    sortable: column.key === "id",
    className: column.key === "id" ? "w-16" : undefined,
  }));

  return (
    <DataTable
      ariaLabel="Property settings"
      columns={columns}
      rows={rows}
      density={density}
      initialSort={{ key: "id", direction: "asc" }}
      getRowKey={(row) => row.id}
      renderCard={(row) => <PhoneCard row={row} canOpen={canOpenProperty} />}
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
