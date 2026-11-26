import { Calendar as CalendarIcon, ChevronDown } from "@/features/stays/icons";
import StaysCard from "./StaysCard";
import { cellStateFor } from "../utils/availability";
import { fromISODate } from "../utils/dates";
import { formatMoney } from "../utils/money";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The monthly availability calendar: a Monday-first month grid where each day
 * shows how many rooms are left and the nightly price. Clicking a day opens the
 * per-date editor; blocked and sold-out days stay visible but are visually
 * muted so the month reads at a glance.
 */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilityCalendar({
  room,
  days,
  padStart = 0,
  overrides = {},
  todayIso,
  currency = DEFAULT_CURRENCY,
  selectedDate,
  monthLabel,
  onCellClick,
}: {
  room: any;
  days: string[];
  padStart?: number;
  overrides?: Record<string, any>;
  todayIso: string;
  currency?: string;
  selectedDate?: string | null;
  monthLabel?: string;
  onCellClick?: (cell: { room: any; date: string }) => void;
}) {
  if (!room) return null;

  return (
    <StaysCard className="overflow-hidden rounded-md border-slate-200 p-0">
      {monthLabel && (
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{monthLabel}</h2>
        </div>
      )}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:text-[11px]"
          >
            {weekday}
          </div>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarIcon size={32} className="mb-2 text-slate-300" weight="light" />
          <p className="text-sm text-slate-400">No dates to show</p>
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {Array.from({ length: padStart }).map((_, index) => (
            <div key={`pad-${index}`} className="min-h-[72px] border-b border-r border-slate-100 bg-slate-50/40 sm:min-h-[110px]" />
          ))}

          {days.map((date) => {
            const { key, override, available } = cellStateFor(room, date, overrides, todayIso);
            const isPast = key === "Past";
            const isBlocked = key === "Blocked";
            const isFull = key === "Full";
            const isSelected = selectedDate === date;
            const hasOverride = Boolean(overrides[`${room.id}|${date}`]);
            const price = override.price ?? room.price;
            const statusText = isBlocked
              ? "Closed"
              : isFull
                ? "Sold out"
                : `${available} left to sell`;

            return (
              <button
                key={date}
                type="button"
                disabled={isPast}
                onClick={() => onCellClick?.({ room, date })}
                aria-label={`${room.name} · ${date} · ${key}`}
                aria-pressed={isSelected || undefined}
                className={cn(
                  "relative flex min-h-[72px] flex-col items-stretch border-b border-r border-slate-100 p-1.5 text-left transition-colors sm:min-h-[110px] sm:p-2.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
                  isPast
                    ? "cursor-default bg-slate-50 text-slate-300"
                    : isBlocked || isFull
                      ? "cursor-pointer bg-slate-50/70 text-slate-400 hover:bg-slate-100"
                      : "cursor-pointer bg-white text-slate-700 hover:bg-surface-soft",
                  isSelected && "z-10 ring-2 ring-inset ring-brand",
                )}
              >
                {hasOverride && !isPast && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                )}

                <span
                  className={cn(
                    "text-sm font-semibold leading-none",
                    isSelected ? "text-brand-ink" : isPast ? "text-slate-300" : "text-slate-800",
                  )}
                >
                  {fromISODate(date).getDate()}
                </span>

                {!isPast && (
                  <>
                    <span
                      className={cn(
                        "mt-2 text-[10px] font-medium leading-tight sm:text-xs",
                        isBlocked || isFull ? "text-slate-400" : available <= 1 ? "text-amber-600" : "text-emerald-700",
                      )}
                    >
                      {statusText}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-1 pt-2 text-[10px] text-slate-500 sm:text-xs">
                      <span className="truncate">{isBlocked ? "—" : formatMoney(price, currency)}</span>
                      {!isBlocked && <ChevronDown size={12} className="shrink-0 text-slate-300" aria-hidden="true" />}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </StaysCard>
  );
}
