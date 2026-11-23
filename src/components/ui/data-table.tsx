import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import type { QueryStatus } from "@/lib/queryState";
import { ArrowDown, ArrowUp, ArrowUpDown } from "@/features/stays/icons";
import Skeleton from "@/components/shared/Skeleton";
import { EmptyState, ErrorState, UnavailableState } from "./states";

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  /** Cell content; defaults to `row[key]`. */
  cell?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  /** Leave this column out of the phone card. */
  hideOnMobile?: boolean;
  sortable?: boolean;
  /** What to sort by when the cell is not a plain value. */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  className?: string;
  /** Label in the phone card (defaults to `header`). */
  mobileLabel?: ReactNode;
};

type Sort = { key: string; direction: "asc" | "desc" };

export type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[] | null | undefined;
  /** Names the table for screen readers. */
  ariaLabel: string;
  getRowKey?: (row: T, index: number) => string | number;
  /** Makes rows (and phone cards) clickable and keyboard-operable. */
  onRowClick?: (row: T) => void;
  /** Accessible name for a clickable row, e.g. "Open booking TG-S-20493". */
  rowLabel?: (row: T) => string;
  /** From `queryStatus()`; drives the loading / error / unavailable slots. */
  status?: QueryStatus;
  onRetry?: () => void;
  /** Shown when there are no rows (defaults to a generic empty state). */
  empty?: ReactNode;
  unavailableFeature?: string;
  loadingRows?: number;
  initialSort?: Sort;
  /** Custom phone card for a row (defaults to label/value pairs). */
  renderCard?: (row: T) => ReactNode;
  /** Force a layout regardless of screen width. */
  layout?: "auto" | "table" | "cards";
  /** Tighter table rows for the operations homepage's "compact" view. */
  density?: "comfortable" | "compact";
  /** Under the rows — usually <Pagination>. */
  footer?: ReactNode;
  className?: string;
};

function readValue<T>(row: T, column: DataColumn<T>): unknown {
  if (column.sortValue) return column.sortValue(row);
  return (row as Record<string, unknown>)[column.key];
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date || b instanceof Date) return new Date(a as Date).getTime() - new Date(b as Date).getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

function activate(event: KeyboardEvent, run: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    run();
  }
}

/**
 * Data table. From `md` up it is a real <table> (sortable headers,
 * right-aligned figures); on phones each row becomes a card, built from the
 * same column config so the two can never drift apart.
 */
export function DataTable<T>({
  columns,
  rows,
  ariaLabel,
  getRowKey = (row, index) => ((row as { id?: string | number }).id ?? index),
  onRowClick,
  rowLabel,
  status = "success",
  onRetry,
  empty,
  unavailableFeature,
  loadingRows = 4,
  initialSort,
  renderCard,
  layout = "auto",
  density = "comfortable",
  footer,
  className,
}: DataTableProps<T>) {
  const wide = useBreakpoint("md");
  const asTable = layout === "table" || (layout === "auto" && wide);
  const [sort, setSort] = useState<Sort | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    const list = rows ?? [];
    if (!sort) return list;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return list;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => factor * compare(readValue(a, column), readValue(b, column)));
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" },
    );

  if (status === "error") return <ErrorState compact onRetry={onRetry} className={className} />;
  if (status === "unavailable") return <UnavailableState compact feature={unavailableFeature} className={className} />;

  if (status === "loading") {
    return (
      <div className={cn("space-y-3 py-2", className)} role="status" aria-label={`Loading ${ariaLabel}`}>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <Skeleton key={i} height={asTable ? 44 : 96} className="rounded-xl" />
        ))}
      </div>
    );
  }

  if (!sorted.length) {
    return <div className={className}>{empty ?? <EmptyState compact title="Nothing here yet" />}</div>;
  }

  const cellOf = (row: T, column: DataColumn<T>) =>
    column.cell ? column.cell(row) : ((row as Record<string, ReactNode>)[column.key] ?? "—");

  if (!asTable) {
    const [first, ...rest] = columns;
    return (
      <div className={className}>
        <ul className="space-y-3" aria-label={ariaLabel}>
          {sorted.map((row, index) => {
            const clickable = Boolean(onRowClick);
            return (
              <li
                key={getRowKey(row, index)}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                onClick={clickable ? () => onRowClick?.(row) : undefined}
                onKeyDown={clickable ? (event) => activate(event, () => onRowClick?.(row)) : undefined}
                className={cn(
                  "rounded-card border border-hairline bg-surface p-4 shadow-xs",
                  clickable &&
                    "cursor-pointer transition-colors active:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {renderCard ? (
                  renderCard(row)
                ) : (
                  <>
                    <div className="mb-3 min-w-0">{cellOf(row, first)}</div>
                    <dl className="space-y-2">
                      {rest
                        .filter((column) => !column.hideOnMobile)
                        .map((column) => (
                          <div key={column.key} className="flex items-start justify-between gap-4">
                            <dt className="shrink-0 text-caption font-semibold text-muted">{column.mobileLabel ?? column.header}</dt>
                            <dd className="min-w-0 text-right text-sm text-ink">{cellOf(row, column)}</dd>
                          </div>
                        ))}
                    </dl>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {footer}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b border-hairline">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const align = ALIGN[column.align ?? "left"];
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "text-overline font-semibold uppercase text-muted",
                      density === "compact" ? "px-2 py-2" : "px-3 py-3",
                      align,
                      column.className,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase hover:text-ink",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active && "text-ink",
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.direction === "asc" ? (
                            <ArrowUp size={12} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={12} aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown size={12} aria-hidden="true" className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const clickable = Boolean(onRowClick);
              return (
                <tr
                  key={getRowKey(row, index)}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                  onClick={clickable ? () => onRowClick?.(row) : undefined}
                  onKeyDown={clickable ? (event) => activate(event, () => onRowClick?.(row)) : undefined}
                  className={cn(
                    "border-b border-hairline last:border-0",
                    clickable &&
                      "cursor-pointer transition-colors hover:bg-surface-soft focus-visible:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "align-middle text-sm text-body",
                        density === "compact" ? "px-2 py-2.5" : "px-3 py-3.5",
                        ALIGN[column.align ?? "left"],
                        column.className,
                      )}
                    >
                      {cellOf(row, column)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
