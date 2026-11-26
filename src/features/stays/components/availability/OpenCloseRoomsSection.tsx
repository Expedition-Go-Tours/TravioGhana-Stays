import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Field } from "@/components/ui";
import DatePicker from "@/components/forms/DatePicker";
import StaysCard from "../StaysCard";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { setAvailabilityRange } from "../../api";
import { isoDaysBetween, shiftISODays, todayISO, weekdayOf } from "../../utils/dates";
import { getErrorMessage } from "@/lib/errorHandler";
import type { RoomType } from "@/types/stays";

const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 0, short: "Sun", label: "Sunday" },
];

type RoomSelection = { mode: "entire" | "plans" | null; planIds: string[] };

function OptionCheckbox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 py-1.5 text-sm leading-relaxed text-body has-disabled:cursor-not-allowed has-disabled:opacity-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="size-[18px] shrink-0 cursor-pointer rounded-[4px] accent-brand disabled:cursor-not-allowed"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

/**
 * Open or close selected rooms across a date range. Writes ordinary
 * availability overrides so the calendar can show and edit the result.
 */
export default function OpenCloseRoomsSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(() => shiftISODays(todayISO(), 30));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [selections, setSelections] = useState<Record<string, RoomSelection>>({});
  const [action, setAction] = useState<"open" | "closed">("open");
  const [busy, setBusy] = useState(false);

  const rooms = useMemo(() => property?.rooms ?? [], [property?.rooms]);
  const plans = useMemo(() => property?.ratePlans ?? [], [property?.ratePlans]);
  const days = useMemo(
    () => isoDaysBetween(from, to).filter((date) => weekdays.includes(weekdayOf(date))),
    [from, to, weekdays],
  );

  const roomPlans = (room: RoomType) => plans.filter((plan) => plan.roomId === room.id);
  const selectionFor = (room: RoomType): RoomSelection =>
    selections[room.id] ?? { mode: null, planIds: [] };
  const roomSelected = (room: RoomType) => {
    const selection = selectionFor(room);
    if (selection.mode === "entire") return true;
    if (selection.mode !== "plans") return false;
    return roomPlans(room).some((plan) => selection.planIds.includes(plan.id));
  };
  const selectedRoomIds = rooms.filter(roomSelected).map((room) => room.id);
  const cells = selectedRoomIds.length * days.length;

  const updateSelection = (roomId: string, next: RoomSelection) =>
    setSelections((current) => ({ ...current, [roomId]: next }));

  const toggleWeekday = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!property) return;
    if (!selectedRoomIds.length) {
      toast.error("Choose at least one room or rate plan");
      return;
    }
    if (!days.length) {
      toast.error("Choose a valid date range and at least one day of the week");
      return;
    }
    setBusy(true);
    try {
      const result = await setAvailabilityRange(property.id, {
        roomIds: selectedRoomIds,
        from,
        to,
        weekdays,
        values: { closed: action === "closed" },
      });
      queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
      toast.success(
        `${result.cells.toLocaleString("en-US")} room-date${result.cells === 1 ? "" : "s"} ${
          action === "closed" ? "closed" : "opened"
        }`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not update the rooms");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <div>
      <AvailabilityPropertyBar properties={properties} property={property} onSelect={selectProperty} />

      {!property ? (
        <StaysCard className="rounded-md">
          <p className="text-sm text-muted">Add a property before managing room availability.</p>
        </StaysCard>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <StaysCard className="rounded-md shadow-none">
            <h2 className="text-lg font-semibold text-ink">Which dates do you want to make changes to?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
              <Field label="From date">
                <DatePicker value={from} onChange={(value) => setFrom(value)} />
              </Field>
              <Field label="To date">
                <DatePicker
                  value={to}
                  minDate={from || undefined}
                  onChange={(value) => setTo(value)}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              {WEEKDAYS.map((day) => (
                <OptionCheckbox
                  key={day.value}
                  checked={weekdays.includes(day.value)}
                  onChange={() => toggleWeekday(day.value)}
                >
                  {day.short}
                </OptionCheckbox>
              ))}
            </div>
          </StaysCard>

          <StaysCard className="rounded-md shadow-none">
            <h2 className="text-lg font-semibold text-ink">
              Which room types and rate plans do you want to open or close?
            </h2>
            <div className="mt-4 space-y-5">
              {rooms.map((room) => {
                const roomRates = roomPlans(room);
                const selection = selectionFor(room);
                const plansSelected = selection.mode === "plans";
                return (
                  <div key={room.id} className="border-t border-hairline pt-4 first:border-t-0 first:pt-0">
                    <h3 className="text-sm font-semibold text-ink">{room.name || room.kind || "Room"}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                      <OptionCheckbox
                        checked={selection.mode === "entire"}
                        onChange={() =>
                          updateSelection(room.id, {
                            mode: selection.mode === "entire" ? null : "entire",
                            planIds: [],
                          })
                        }
                      >
                        Entire room
                      </OptionCheckbox>
                      <OptionCheckbox
                        checked={plansSelected}
                        disabled={roomRates.length === 0}
                        onChange={() =>
                          updateSelection(room.id, {
                            mode: plansSelected ? null : "plans",
                            planIds: plansSelected ? [] : roomRates.map((plan) => plan.id),
                          })
                        }
                      >
                        Specific rate plans
                      </OptionCheckbox>
                    </div>
                    {plansSelected && (
                      <div className="mt-2 grid gap-1 rounded-md border border-hairline bg-surface-soft/40 p-2 sm:grid-cols-2">
                        {roomRates.map((plan) => (
                          <OptionCheckbox
                            key={plan.id}
                            checked={selection.planIds.includes(plan.id)}
                            onChange={() =>
                              updateSelection(room.id, {
                                mode: "plans",
                                planIds: selection.planIds.includes(plan.id)
                                  ? selection.planIds.filter((id) => id !== plan.id)
                                  : [...selection.planIds, plan.id],
                              })
                            }
                          >
                            {plan.name}
                          </OptionCheckbox>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {rooms.length === 0 && <p className="text-sm text-muted">Add a room before managing availability.</p>}
            </div>
          </StaysCard>

          <StaysCard className="rounded-md shadow-none">
            <h2 className="text-lg font-semibold text-ink">Set the selected rooms and rates as:</h2>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1" role="radiogroup" aria-label="Room status">
              {[
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-9 cursor-pointer items-center gap-2.5 py-1.5 text-sm text-body"
                >
                  <input
                    type="radio"
                    name="open-close-action"
                    value={option.value}
                    checked={action === option.value}
                    onChange={() => setAction(option.value as "open" | "closed")}
                    className="size-4 shrink-0 accent-brand"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </StaysCard>

          <div>
            <Button type="submit" variant="primary" loading={busy} disabled={!cells}>
              Save changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
