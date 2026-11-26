// @ts-nocheck
// Migration marker: ported from JavaScript; section data shapes are not annotated yet.
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BedDouble,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "@/features/stays/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StaysCard from "../StaysCard";
import StaysEmptyState from "../StaysEmptyState";
import StaysSeg from "../StaysSeg";
import { StaysSelect } from "../StaysForm";
import AvailabilityCalendar from "../AvailabilityCalendar";
import AvailabilityCellPanel from "../AvailabilityCellPanel";
import AvailabilityYearView from "./AvailabilityYearView";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { applyRestrictionRules } from "../../utils/restrictions";
import {
  clearAvailabilityCell,
  getAvailability,
  setAvailabilityCell,
  STAYS_KEYS,
} from "../../api";
import {
  monthGridFor,
  monthsFrom,
  shiftISOMonths,
  todayISO,
} from "../../utils/dates";

const VIEWS = [
  { value: "monthly", label: "Monthly view" },
  { value: "yearly", label: "Yearly view" },
] as const;

type CalendarView = (typeof VIEWS)[number]["value"];

function viewFor(value: string | null): CalendarView {
  return VIEWS.some((view) => view.value === value) ? (value as CalendarView) : "monthly";
}

/** The Calendar view, with monthly and yearly presentations. */
export default function CalendarSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cell, setCell] = useState(null);
  const [yearRange, setYearRange] = useState("12");
  const [yearFilter, setYearFilter] = useState<"all" | "bookable" | "soldout">("all");

  const today = todayISO();
  const anchor = searchParams.get("date") || today;
  const view = viewFor(searchParams.get("view"));
  const requestedRoomId = searchParams.get("room");
  const rooms = property?.rooms || [];
  const room = rooms.find((option) => option.id === requestedRoomId) || rooms[0] || null;

  const monthRange = useMemo(() => monthGridFor(anchor), [anchor]);
  const yearMonths = useMemo(() => monthsFrom(anchor, Number(yearRange) || 12), [anchor, yearRange]);
  const yearDays = useMemo(() => yearMonths.flatMap((month) => month.days), [yearMonths]);

  const range =
    view === "monthly"
      ? monthRange
      : {
          days: yearDays,
          from: yearDays[0],
          to: yearDays[yearDays.length - 1],
          label: `${yearMonths[0]?.label} – ${yearMonths[yearMonths.length - 1]?.label}`,
        };

  const { data, isLoading: loadingAvailability, isFetching } = useQuery({
    queryKey: STAYS_KEYS.availability(property?.id, range.from, range.to),
    queryFn: () => getAvailability(property?.id, { from: range.from, to: range.to }),
    enabled: Boolean(property?.id && range.from && range.to),
    staleTime: 15_000,
  });

  const overrides = useMemo(() => data?.overrides ?? {}, [data]);
  const effectiveOverrides = useMemo(
    () =>
      room
        ? applyRestrictionRules(room, range.days, overrides, property?.restrictionRules ?? [])
        : overrides,
    [room, range.days, overrides, property?.restrictionRules],
  );

  const setView = (next: CalendarView) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === "monthly") params.delete("view");
        else params.set("view", next);
        return params;
      },
      { replace: true },
    );

  const setAnchor = (iso: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("date", iso);
        return next;
      },
      { replace: true },
    );

  const setRoom = (roomId: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("room", roomId);
        return next;
      },
      { replace: true },
    );

  const changeProperty = (id: string) => {
    setCell(null);
    selectProperty(id);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("room");
        return next;
      },
      { replace: true },
    );
  };

  const shiftPeriod = (direction: number) => {
    if (view === "monthly") setAnchor(shiftISOMonths(anchor, direction));
    else setAnchor(shiftISOMonths(anchor, direction * 12));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
  const saveMutation = useMutation({
    mutationFn: ({ roomId, date, values }) => setAvailabilityCell(property.id, { roomId, date, values }),
    onSuccess: invalidate,
  });
  const clearMutation = useMutation({
    mutationFn: ({ roomId, date }) => clearAvailabilityCell(property.id, { roomId, date }),
    onSuccess: () => {
      invalidate();
      toast.success("Reset to the room defaults");
    },
  });
  const pending = saveMutation.isPending || clearMutation.isPending;

  return (
    <div>
      <StaysCard className="mb-4 rounded-md p-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-caption font-semibold text-muted">Property</span>
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="shrink-0 text-slate-400" />
                <Select value={property?.id || ""} onValueChange={changeProperty}>
                  <SelectTrigger aria-label="Selected property" className="min-w-0 flex-1 px-3 text-sm font-medium text-slate-900">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-caption font-semibold text-muted">Room type</span>
              <div className="flex items-center gap-2">
                <BedDouble size={16} className="shrink-0 text-slate-400" />
                <Select
                  value={room?.id || ""}
                  onValueChange={(id) => {
                    setCell(null);
                    setRoom(id);
                  }}
                  disabled={!rooms.length}
                >
                  <SelectTrigger aria-label="Selected room" className="min-w-0 flex-1 px-3 text-sm text-slate-700">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block sm:w-44">
              <span className="mb-1.5 block text-caption font-semibold text-muted">View</span>
              <StaysSelect
                aria-label="Calendar view"
                options={VIEWS}
                value={view}
                onChange={(event) => setView(event.target.value as CalendarView)}
              />
            </label>
            {view === "yearly" && (
              <label className="block sm:w-40">
                <span className="mb-1.5 block text-caption font-semibold text-muted">Range</span>
                <StaysSelect
                  aria-label="Calendar range"
                  options={[
                    { value: "6", label: "Next 6 months" },
                    { value: "12", label: "Next 12 months" },
                  ]}
                  value={yearRange}
                  onChange={(event) => setYearRange(event.target.value)}
                />
              </label>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => shiftPeriod(-1)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Previous period"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[10rem] select-none text-center text-sm font-semibold text-slate-800">
                {range.label}
              </span>
              <button
                type="button"
                onClick={() => shiftPeriod(1)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Next period"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {isFetching && <RefreshCw size={13} className="shrink-0 animate-spin text-slate-400" />}
          </div>

          {view === "yearly" && (
            <div className="flex flex-wrap items-center gap-2">
              <StaysSeg
                variant="segmented"
                ariaLabel="Yearly date filter"
                options={[
                  { value: "all", label: "All dates" },
                  { value: "bookable", label: "Bookable dates" },
                  { value: "soldout", label: "Sold out dates" },
                ]}
                value={yearFilter}
                onChange={(next) => setYearFilter(next as typeof yearFilter)}
              />
            </div>
          )}
        </div>
      </StaysCard>

      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setAnchor(today)}
          className="inline-flex h-9 items-center justify-center rounded-control border border-hairline-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-slate-400"
        >
          Today
        </button>
        <Link
          to="/stays/availability?section=restrictions"
          className="inline-flex h-9 items-center justify-center rounded-control border border-hairline-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-slate-400"
        >
          Manage calendar settings
        </Link>
      </div>

      {isLoading || (property && loadingAvailability) ? (
        <StaysCard className="min-h-[300px] animate-pulse rounded-md bg-white/60" />
      ) : !property ? (
        <StaysCard className="rounded-md">
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then manage its availability.
          </StaysEmptyState>
        </StaysCard>
      ) : rooms.length && room ? (
        view === "monthly" ? (
          <AvailabilityCalendar
            room={room}
            days={monthRange.days}
            padStart={monthRange.padStart}
            overrides={effectiveOverrides}
            todayIso={today}
            currency={data?.currency}
            selectedDate={cell?.date}
            monthLabel={monthRange.label}
            onCellClick={(next) => setCell({ ...next, openKey: Date.now() })}
          />
        ) : (
          <AvailabilityYearView
            room={room}
            months={yearMonths}
            overrides={effectiveOverrides}
            todayIso={today}
            filter={yearFilter}
            selectedDate={cell?.date}
            onCellClick={(next) => setCell({ ...next, openKey: Date.now() })}
          />
        )
      ) : (
        <StaysCard className="rounded-md">
          <StaysEmptyState title="No rooms yet">
            Add a room in the property builder to start managing availability.
          </StaysEmptyState>
        </StaysCard>
      )}

      <AvailabilityCellPanel
        key={cell?.openKey}
        open={Boolean(cell)}
        room={cell?.room}
        date={cell?.date}
        override={cell ? effectiveOverrides[`${cell.room.id}|${cell.date}`] : undefined}
        todayIso={today}
        currency={data?.currency}
        pending={pending}
        onClose={() => setCell(null)}
        onApply={(values, message) =>
          saveMutation.mutate(
            { roomId: cell.room.id, date: cell.date, values },
            { onSuccess: () => toast.success(message || "Availability updated") },
          )
        }
        onClear={() => clearMutation.mutate({ roomId: cell.room.id, date: cell.date })}
      />
    </div>
  );
}
