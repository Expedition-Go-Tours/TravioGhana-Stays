import { Link } from "react-router-dom";
import { Badge, DataTable, EmptyState, StatusBadge, type DataColumn } from "@/components/ui";
import { Buildings, ChatText, DoorOpen, SignOut, XCircle } from "@/features/stays/icons";
import type { DashboardPropertyRow } from "@/types/stays";
import { cn } from "@/lib/utils";
import DashboardPropertyIdentity from "./DashboardPropertyIdentity";
import {
  DASHBOARD_COLUMNS,
  propertyStatusLabel,
  type DashboardColumnKey,
  type DashboardDensity,
} from "./dashboardModel";

function PropertyStatus({ row }: { row: DashboardPropertyRow }) {
  if (row.status === "Paused") {
    return (
      <Badge tone="danger" dot>
        {propertyStatusLabel(row.status)}
      </Badge>
    );
  }
  return <StatusBadge domain="property" status={row.status} />;
}

function CountCell({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("figures tabular-nums", value === 0 ? "text-muted" : "font-semibold text-ink", className)}>
      {value.toLocaleString("en-US")}
    </span>
  );
}

/** A phone card that keeps the property and its four operational counts together. */
function PropertyCard({
  row,
  canOpenProperty,
  canOpenChat,
}: {
  row: DashboardPropertyRow;
  canOpenProperty: boolean;
  canOpenChat: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <DashboardPropertyIdentity row={row} canOpen={canOpenProperty} />
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PropertyStatus row={row} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 text-sm">
        <div>
          <dt className="flex items-center gap-1 text-caption font-semibold text-muted">
            <DoorOpen size={13} aria-hidden="true" /> Arrivals (48h)
          </dt>
          <dd className="mt-0.5">
            <CountCell value={row.arrivalsNext48h} />
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-caption font-semibold text-muted">
            <SignOut size={13} aria-hidden="true" /> Departures (48h)
          </dt>
          <dd className="mt-0.5">
            <CountCell value={row.departuresNext48h} />
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-caption font-semibold text-muted">
            <ChatText size={13} aria-hidden="true" /> Guest messages
          </dt>
          <dd className="mt-0.5">
            {canOpenChat && row.guestMessages > 0 ? (
              <Link to="/stays/customers" className="font-semibold text-brand-ink hover:underline">
                <CountCell value={row.guestMessages} />
              </Link>
            ) : (
              <CountCell value={row.guestMessages} />
            )}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-caption font-semibold text-muted">
            <XCircle size={13} aria-hidden="true" /> Travio messages
          </dt>
          <dd className="mt-0.5">
            <CountCell value={row.supportMessages} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Per-property operations table. It is a real table from `md` up and a set of
 * cards on phones, built from the same columns so the two never drift.
 */
export default function PropertyOperationsTable({
  rows,
  hiddenColumns,
  density,
  canOpenProperty,
  canOpenChat,
}: {
  rows: DashboardPropertyRow[];
  hiddenColumns: DashboardColumnKey[];
  density: DashboardDensity;
  canOpenProperty: boolean;
  canOpenChat: boolean;
}) {
  const cellByKey: Record<DashboardColumnKey, DataColumn<DashboardPropertyRow>["cell"]> = {
    property: (row) => <DashboardPropertyIdentity row={row} canOpen={canOpenProperty} />,
    status: (row) => <PropertyStatus row={row} />,
    arrivalsNext48h: (row) => <CountCell value={row.arrivalsNext48h} />,
    departuresNext48h: (row) => <CountCell value={row.departuresNext48h} />,
    guestMessages: (row) =>
      canOpenChat && row.guestMessages > 0 ? (
        <Link
          to="/stays/customers"
          aria-label={`${row.guestMessages} guest messages for ${row.name}`}
          className="rounded-sm text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CountCell value={row.guestMessages} />
        </Link>
      ) : (
        <CountCell value={row.guestMessages} />
      ),
    supportMessages: (row) => <CountCell value={row.supportMessages} />,
  };

  const columns: DataColumn<DashboardPropertyRow>[] = DASHBOARD_COLUMNS.filter(
    (column) => !hiddenColumns.includes(column.key),
  ).map((column) => ({
    key: column.key,
    header: column.label,
    cell: cellByKey[column.key],
    sortable: column.key === "property",
    sortValue: column.key === "property" ? (row) => row.name : undefined,
  }));

  return (
    <DataTable
      ariaLabel="Property operations"
      columns={columns}
      rows={rows}
      density={density}
      getRowKey={(row) => row.id}
      renderCard={(row) => (
        <PropertyCard row={row} canOpenProperty={canOpenProperty} canOpenChat={canOpenChat} />
      )}
      empty={
        <EmptyState
          compact
          icon={<Buildings size={22} />}
          title="No properties match"
          description="Try another location, status or search."
        />
      }
    />
  );
}
