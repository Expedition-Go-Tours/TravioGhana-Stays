import Skeleton, { TableSkeleton } from "@/components/shared/Skeleton";

/**
 * Route-level loading shell shown while a page chunk is fetched. It mirrors the
 * common page rhythm (header, toolbar, stats, content) so navigation never
 * flashes a blank canvas.
 */
export default function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" aria-busy="true" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton width={84} height={10} className="rounded-md" />
          <Skeleton width={230} height={30} className="rounded-md" />
          <Skeleton width="min(22rem, 70vw)" height={14} className="rounded-md" />
        </div>
        <Skeleton width={138} height={44} className="rounded-control" />
      </div>

      <Skeleton height={60} className="rounded-md" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-md border border-hairline bg-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Skeleton width="45%" height={13} />
              <Skeleton variant="circular" width={32} height={32} />
            </div>
            <Skeleton width="55%" height={24} className="mb-2" />
            <Skeleton width="40%" height={11} />
          </div>
        ))}
      </div>

      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
