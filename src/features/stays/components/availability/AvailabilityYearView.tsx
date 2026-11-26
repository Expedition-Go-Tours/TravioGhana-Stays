import StaysCard from "../StaysCard";
import { cellStateFor } from "../../utils/availability";
import { fromISODate } from "../../utils/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_TONE = {
  Available: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  Limited: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  Full: "bg-rose-100 text-rose-700 hover:bg-rose-200",
  Blocked: "bg-rose-100 text-rose-700 hover:bg-rose-200",
  Past: "bg-transparent text-slate-300",
};

/** Twelve small month grids with each date tinted by its availability state. */
export default function AvailabilityYearView({
  room,
  months,
  overrides = {},
  todayIso,
  filter = "all",
  selectedDate,
  onCellClick,
}: {
  room: any;
  months: Array<{ label: string; days: string[]; padStart: number }>;
  overrides?: Record<string, any>;
  todayIso: string;
  filter?: "all" | "bookable" | "soldout";
  selectedDate?: string | null;
  onCellClick?: (cell: { room: any; date: string }) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {months.map((month) => (
        <StaysCard key={month.label} className="rounded-md p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">{month.label}</h3>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="pb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {day}
              </span>
            ))}
            {Array.from({ length: month.padStart }).map((_, index) => (
              <span key={`pad-${index}`} aria-hidden="true" />
            ))}
            {month.days.map((date) => {
              const { key } = cellStateFor(room, date, overrides, todayIso);
              const matches =
                filter === "all" ||
                (filter === "bookable" && (key === "Available" || key === "Limited")) ||
                (filter === "soldout" && (key === "Full" || key === "Blocked"));
              const isPast = key === "Past";
              const isSelected = selectedDate === date;
              return (
                <button
                  key={date}
                  type="button"
                  disabled={isPast}
                  onClick={() => onCellClick?.({ room, date })}
                  aria-label={`${room.name} · ${date} · ${key}`}
                  aria-pressed={isSelected || undefined}
                  className={cn(
                    "grid aspect-square place-items-center rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isPast ? STATUS_TONE.Past : matches ? STATUS_TONE[key] : "text-slate-400 hover:bg-surface-soft",
                    isSelected && "ring-2 ring-brand ring-offset-1",
                  )}
                >
                  {fromISODate(date).getDate()}
                </button>
              );
            })}
          </div>
        </StaysCard>
      ))}
    </div>
  );
}
