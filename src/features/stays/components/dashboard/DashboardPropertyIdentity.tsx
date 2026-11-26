import { Link } from "react-router-dom";
import { Buildings, MapPin } from "@/features/stays/icons";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { cn } from "@/lib/utils";
import { resolvePropertyPhoto } from "../../utils/propertyPhoto";

type PropertyIdentity = {
  id: string;
  name: string;
  city: string;
  region: string;
  photo?: string | null;
  coverPhoto?: string | null;
  photos?: unknown;
};

const THUMB = "h-10 w-14 shrink-0 rounded-lg";

/** Cover thumbnail + name + city, shared by the three dashboard tables. */
export default function DashboardPropertyIdentity({
  row,
  canOpen,
}: {
  row: PropertyIdentity;
  canOpen: boolean;
}) {
  const photo = resolvePropertyPhoto(row);

  return (
    <span className="flex min-w-0 items-center gap-3">
      {photo ? (
        <OptimizedImage
          src={photo}
          width={112}
          height={80}
          alt=""
          data-testid="dashboard-property-photo"
          className={cn(THUMB, "object-cover")}
        />
      ) : (
        <span
          aria-hidden="true"
          data-testid="dashboard-property-photo-placeholder"
          className={cn(THUMB, "flex items-center justify-center bg-brand-soft text-brand-ink")}
        >
          <Buildings size={18} />
        </span>
      )}
      <span className="min-w-0">
        {canOpen ? (
          <Link
            to={`/stays/properties/${encodeURIComponent(row.id)}`}
            className="block truncate rounded-sm text-sm font-semibold text-ink transition-colors hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {row.name}
          </Link>
        ) : (
          <span className="block truncate text-sm font-semibold text-ink">{row.name}</span>
        )}
        <span className="mt-0.5 flex items-center gap-1 text-caption text-muted">
          <MapPin size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{[row.city, row.region].filter(Boolean).join(", ") || "Location pending"}</span>
        </span>
      </span>
    </span>
  );
}
