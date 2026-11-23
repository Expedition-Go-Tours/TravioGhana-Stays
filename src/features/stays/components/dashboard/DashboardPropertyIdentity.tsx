import { Link } from "react-router-dom";
import { Buildings, MapPin } from "@/features/stays/icons";
import { cn } from "@/lib/utils";

type PropertyIdentity = {
  id: string;
  name: string;
  city: string;
  region: string;
  photo?: string | null;
};

const THUMB = "h-10 w-10 shrink-0 rounded-lg";

/** Thumbnail/initials + name + city, shared by the three dashboard tables. */
export default function DashboardPropertyIdentity({
  row,
  canOpen,
}: {
  row: PropertyIdentity;
  canOpen: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {row.photo ? (
        <img src={row.photo} alt="" loading="lazy" className={cn(THUMB, "object-cover")} />
      ) : (
        <span aria-hidden="true" className={cn(THUMB, "flex items-center justify-center bg-brand-soft text-brand-ink")}>
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
