import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "circular" | "rectangular";
  width?: number | string;
  height?: number;
  count?: number;
};

/**
 * Loading placeholder. Theme-aware (a pulse on the strong surface colour) and
 * hidden from assistive tech — announce loading with text, not shapes.
 */
export default function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  count = 1,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const sizeStyle: CSSProperties = {
    width: width === undefined ? undefined : typeof width === "number" ? `${width}px` : width,
    height: height === undefined ? undefined : `${height}px`,
    ...style,
  };

  const element = (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-surface-strong", variantClasses[variant], className)}
      style={sizeStyle}
      {...props}
    />
  );

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>{element}</div>
        ))}
      </div>
    );
  }

  return element;
}

const frame = "overflow-hidden rounded-card border border-hairline bg-surface";

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  return (
    <div className={frame} role="status" aria-label="Loading">
      <div className="border-b border-hairline bg-surface-soft p-4">
        <div className="grid gap-4" style={grid}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={14} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-hairline p-4 last:border-b-0">
          <div className="grid gap-4" style={grid}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={18} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(frame, "p-4")}>
          <Skeleton height={200} className="mb-4" />
          <Skeleton height={24} className="mb-2" />
          <Skeleton height={16} width="60%" className="mb-4" />
          <div className="flex items-center justify-between">
            <Skeleton height={20} width={80} />
            <Skeleton height={32} width={100} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className={cn(frame, "p-6")} role="status" aria-label="Loading">
      <Skeleton height={24} width="40%" className="mb-4" />
      <Skeleton height={height} />
    </div>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className={cn(frame, "space-y-6 p-6")} role="status" aria-label="Loading">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton height={16} width={120} className="mb-2" />
          <Skeleton height={44} />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton height={44} width={100} />
        <Skeleton height={44} width={100} />
      </div>
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(frame, "p-4 sm:p-5")} role="status" aria-label="Loading">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton height={14} width="45%" />
            <Skeleton variant="circular" width={36} height={36} />
          </div>
          <Skeleton height={28} width="60%" className="mb-2" />
          <Skeleton height={12} width="40%" />
        </div>
      ))}
    </>
  );
}
