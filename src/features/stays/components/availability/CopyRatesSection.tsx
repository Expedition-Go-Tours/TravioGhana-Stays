import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Field, Input } from "@/components/ui";
import { StaysSelect } from "../StaysForm";
import DatePicker from "@/components/forms/DatePicker";
import StaysCard from "../StaysCard";
import AvailabilityNotice from "./AvailabilityNotice";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { copyAvailabilityRange } from "../../api";
import { shiftISOMonths, todayISO } from "../../utils/dates";
import { copyDatePairs, type CopyRateAdjustment } from "../../utils/copyRates";
import { getErrorMessage } from "@/lib/errorHandler";
import type { RatePlan } from "@/types/stays";

const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 0, short: "Sun", label: "Sunday" },
];

type DatePreset = "full-year" | "next-90-days" | "custom";

const RATE_CHANGES = [
  { value: "use-current", label: "Use current rates" },
  { value: "increase-fixed", label: "Increase rates by a fixed amount" },
  { value: "increase-percent", label: "Increase rates by a percentage" },
  { value: "decrease-percent", label: "Decrease rates by a percentage" },
  { value: "decrease-fixed", label: "Decrease rates by a fixed amount" },
] as const;
type RateChange = (typeof RATE_CHANGES)[number]["value"];

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-hairline py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-ink sm:max-w-[70%] sm:text-right">{value}</dd>
    </div>
  );
}

function CompactCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-start gap-2.5 py-1.5 text-sm leading-relaxed text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded-[4px] accent-brand"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

export default function CopyRatesSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const currentYear = Number(todayISO().slice(0, 4));
  const [preset, setPreset] = useState<DatePreset>("full-year");
  const [customFrom, setCustomFrom] = useState(() => todayISO());
  const [customTo, setCustomTo] = useState(() => shiftISOMonths(todayISO(), 1));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [planSelection, setPlanSelection] = useState<{ propertyId: string | null; ids: Set<string> }>({
    propertyId: null,
    ids: new Set(),
  });
  const [rateChange, setRateChange] = useState<RateChange>("use-current");
  const [rateChangeValue, setRateChangeValue] = useState("10");
  const [copyRestrictions, setCopyRestrictions] = useState(false);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reviewing = reviewFor === property?.id;

  const allPlans = useMemo(
    () =>
      (property?.ratePlans ?? []).filter((plan) =>
        (property?.rooms ?? []).some((room) => room.id === plan.roomId),
      ),
    [property?.ratePlans, property?.rooms],
  );
  const roomGroups = useMemo(
    () =>
      (property?.rooms ?? [])
        .map((room) => ({ room, plans: allPlans.filter((plan) => plan.roomId === room.id) }))
        .filter((group) => group.plans.length > 0),
    [property?.rooms, allPlans],
  );
  const effectivePlanIds = useMemo(
    () => (planSelection.propertyId === (property?.id ?? null) ? planSelection.ids : new Set<string>()),
    [planSelection, property?.id],
  );
  const selectedPlans = useMemo(
    () => allPlans.filter((plan) => effectivePlanIds.has(plan.id)),
    [allPlans, effectivePlanIds],
  );
  const selectedRoomIds = useMemo(
    () => Array.from(new Set(selectedPlans.map((plan) => plan.roomId))),
    [selectedPlans],
  );

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    if (preset === "next-90-days") {
      const from = todayISO();
      const to = shiftISOMonths(from, 3);
      return { from, to };
    }
    return { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };
  }, [preset, customFrom, customTo, currentYear]);

  const targetFrom = useMemo(() => (range.from ? shiftISOMonths(range.from, 12) : ""), [range.from]);
  const targetTo = useMemo(() => (range.to ? shiftISOMonths(range.to, 12) : ""), [range.to]);
  const sourceYear = range.from.slice(0, 4);
  const targetYear = targetFrom.slice(0, 4) || String(currentYear + 1);
  const pairs = useMemo(
    () =>
      copyDatePairs({
        from: range.from,
        to: range.to,
        targetFrom,
        targetTo,
        weekdays,
      }),
    [range.from, range.to, targetFrom, targetTo, weekdays],
  );
  const cells = pairs.length * selectedRoomIds.length;

  const changePlanSelection = (updater: (current: Set<string>) => Set<string>) => {
    const propertyId = property?.id ?? null;
    setPlanSelection((current) => {
      const base = current.propertyId === propertyId ? current.ids : new Set<string>();
      return { propertyId, ids: updater(base) };
    });
  };

  const adjustment = useMemo<CopyRateAdjustment | null>(() => {
    const value = Math.max(0, Number(rateChangeValue) || 0);
    if (rateChange === "increase-fixed") return { direction: "increase", unit: "amount", value };
    if (rateChange === "increase-percent") return { direction: "increase", unit: "percent", value };
    if (rateChange === "decrease-fixed") return { direction: "decrease", unit: "amount", value };
    if (rateChange === "decrease-percent") return { direction: "decrease", unit: "percent", value };
    return null;
  }, [rateChange, rateChangeValue]);

  const toggleWeekday = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );

  const togglePlan = (plan: RatePlan) =>
    changePlanSelection((current) => {
      const next = new Set(current);
      if (next.has(plan.id)) next.delete(plan.id);
      else next.add(plan.id);
      return next;
    });

  const toggleRoom = (roomId: string) => {
    const plans = allPlans.filter((plan) => plan.roomId === roomId);
    const allSelected = plans.every((plan) => effectivePlanIds.has(plan.id));
    changePlanSelection((current) => {
      const next = new Set(current);
      plans.forEach((plan) => {
        if (allSelected) next.delete(plan.id);
        else next.add(plan.id);
      });
      return next;
    });
  };

  const toggleAllPlans = () => {
    const allSelected = allPlans.length > 0 && allPlans.every((plan) => effectivePlanIds.has(plan.id));
    changePlanSelection(() => (allSelected ? new Set() : new Set(allPlans.map((plan) => plan.id))));
  };

  const review = () => {
    if (!range.from || !range.to || range.from > range.to) {
      toast.error("Choose a valid source date range");
      return;
    }
    if (!weekdays.length) {
      toast.error("Choose at least one day of the week");
      return;
    }
    if (!selectedRoomIds.length) {
      toast.error("Choose at least one rate plan");
      return;
    }
    if (adjustment && adjustment.value <= 0) {
      toast.error("Enter a rate change value");
      return;
    }
    setReviewFor(property?.id ?? null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!property) return;
    setBusy(true);
    try {
      const result = await copyAvailabilityRange(property.id, {
        roomIds: selectedRoomIds,
        from: range.from,
        to: range.to,
        targetFrom,
        targetTo,
        weekdays,
        fields: {
          price: true,
          count: true,
          ...(copyRestrictions
            ? {
                minStay: true,
                maxStay: true,
                closed: true,
                closedArrival: true,
                closedDeparture: true,
              }
            : {}),
        },
        adjustment,
        overwrite: true,
      });
      queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
      toast.success(
        `${result.cells.toLocaleString("en-US")} room-date${result.cells === 1 ? "" : "s"} copied to ${targetFrom.slice(0, 4)}`,
      );
      setReviewFor(null);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not copy the rates");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <div>
      <AvailabilityPropertyBar properties={properties} property={property} onSelect={selectProperty} />

      {!property ? (
        <StaysCard>
          <p className="text-sm text-slate-500">Add a property before copying rates.</p>
        </StaysCard>
      ) : reviewing ? (
        <form onSubmit={submit}>
          <StaysCard className="rounded-md shadow-none">
            <h2 className="text-xl font-bold text-ink">Review your copy</h2>
            <p className="mt-1 text-sm text-muted">
              Check every selection before writing the copied rates to the calendar.
            </p>
            <dl className="mt-5 rounded-md border border-hairline px-4">
              <SummaryRow label="Source dates" value={`${range.from} → ${range.to}`} />
              <SummaryRow label="Copy to" value={`${targetFrom} → ${targetTo}`} />
              <SummaryRow
                label="Days of the week"
                value={WEEKDAYS.filter((day) => weekdays.includes(day.value))
                  .map((day) => day.short)
                  .join(", ")}
              />
              <SummaryRow
                label="Room types and rate plans"
                value={
                  selectedPlans.length === allPlans.length
                    ? `All rate plans (${allPlans.length})`
                    : selectedPlans.map((plan) => plan.name).join(", ")
                }
              />
              <SummaryRow
                label="Rate change"
                value={
                  rateChange === "use-current"
                    ? "Use current rates"
                    : RATE_CHANGES.find((option) => option.value === rateChange)?.label
                }
              />
              <SummaryRow label="Restrictions" value={copyRestrictions ? "Copied" : "Not copied"} />
              <SummaryRow
                label="Room-dates"
                value={`${cells.toLocaleString("en-US")} room-date${cells === 1 ? "" : "s"}`}
              />
            </dl>
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-between">
              <Button type="button" onClick={() => setReviewFor(null)} disabled={busy}>
                Back
              </Button>
              <Button type="submit" variant="primary" loading={busy} disabled={!cells}>
                Copy rates
              </Button>
            </div>
          </StaysCard>
        </form>
      ) : (
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="space-y-4">
            <StaysCard className="rounded-md shadow-none">
              <h2 className="text-lg font-semibold text-ink">Which dates would you like to copy rates from?</h2>
              <div className="mt-4 grid gap-3">
                <Field label="Select date range">
                  <StaysSelect
                    aria-label="Select date range"
                    options={[
                      { value: "full-year", label: `Full year ${currentYear}` },
                      { value: "next-90-days", label: "Next 90 days" },
                      { value: "custom", label: "Custom date range" },
                    ]}
                    value={preset}
                    onChange={(event) => setPreset(event.target.value as DatePreset)}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="From">
                    <DatePicker
                      value={range.from}
                      disabled={preset !== "custom"}
                      onChange={(value) => setCustomFrom(value)}
                    />
                  </Field>
                  <Field label="To">
                    <DatePicker
                      value={range.to}
                      minDate={range.from || undefined}
                      disabled={preset !== "custom"}
                      onChange={(value) => setCustomTo(value)}
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-4">
                <AvailabilityNotice>Rates will be copied over to {targetYear}</AvailabilityNotice>
              </div>
            </StaysCard>

            <StaysCard className="rounded-md shadow-none">
              <h2 className="text-lg font-semibold text-ink">
                Which days of the week would you like to copy rates from?
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                {WEEKDAYS.map((day) => (
                  <CompactCheckbox
                    key={day.value}
                    checked={weekdays.includes(day.value)}
                    onChange={() => toggleWeekday(day.value)}
                  >
                    {day.short}
                  </CompactCheckbox>
                ))}
              </div>
              <div className="mt-4">
                <AvailabilityNotice>
                  Your rates will be copied over to the respective days of the week next year. First Monday of your
                  chosen range in {sourceYear} being copied to the first Monday of the same range in {targetYear} and
                  so on.
                </AvailabilityNotice>
              </div>
            </StaysCard>

            <StaysCard className="rounded-md shadow-none">
              <h2 className="text-lg font-semibold text-ink">
                Which room types and rate plans do you want to copy?
              </h2>
              <div className="mt-3">
                <CompactCheckbox
                  checked={allPlans.length > 0 && allPlans.every((plan) => effectivePlanIds.has(plan.id))}
                  onChange={toggleAllPlans}
                >
                  Select all rate plans for all room types
                </CompactCheckbox>
              </div>
              <div className="mt-4 space-y-5 border-t border-hairline pt-4">
                {roomGroups.map(({ room, plans }) => {
                  const allRoomSelected = plans.every((plan) => effectivePlanIds.has(plan.id));
                  return (
                    <div key={room.id}>
                      <h3 className="text-sm font-semibold text-ink">{room.name || room.kind || "Room"}</h3>
                      <div className="mt-1">
                        <CompactCheckbox checked={allRoomSelected} onChange={() => toggleRoom(room.id)}>
                          Select all rate plans
                        </CompactCheckbox>
                      </div>
                      <div className="mt-1 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => (
                          <CompactCheckbox
                            key={plan.id}
                            checked={effectivePlanIds.has(plan.id)}
                            onChange={() => togglePlan(plan)}
                          >
                            {plan.name}
                          </CompactCheckbox>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {roomGroups.length === 0 && (
                  <p className="text-sm text-muted">Add a rate plan before copying rates.</p>
                )}
              </div>
            </StaysCard>

            <StaysCard className="rounded-md shadow-none">
              <h2 className="text-lg font-semibold text-ink">Do you want to make changes to the rates?</h2>
              <div className="mt-2 grid gap-0.5" role="radiogroup" aria-label="Rate change">
                {RATE_CHANGES.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm text-body"
                  >
                    <input
                      type="radio"
                      name="copy-rate-change"
                      value={option.value}
                      checked={rateChange === option.value}
                      onChange={() => setRateChange(option.value)}
                      className="size-4 shrink-0 accent-brand"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {adjustment && (
                <div className="mt-3 sm:max-w-[14rem]">
                  <Field label={adjustment.unit === "percent" ? "Percentage" : "Amount"}>
                    <Input
                      type="number"
                      min="0"
                      step={adjustment.unit === "percent" ? "0.5" : "1"}
                      value={rateChangeValue}
                      onChange={(event) => setRateChangeValue(event.target.value)}
                      trailing={adjustment.unit === "percent" ? "%" : undefined}
                    />
                  </Field>
                </div>
              )}
            </StaysCard>

            <StaysCard className="rounded-md shadow-none">
              <h2 className="text-lg font-semibold text-ink">
                Do you want to copy over the restrictions for these dates?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                This refers to, for example, the length of stay, departure, arrival, or advance reservation
                restrictions you may have set.
              </p>
              <div className="mt-3">
                <CompactCheckbox checked={copyRestrictions} onChange={() => setCopyRestrictions((value) => !value)}>
                  Yes, copy all my restrictions for this date range
                </CompactCheckbox>
              </div>
            </StaysCard>

            <AvailabilityNotice>
              You can check all your selections on the next page before saving any changes
            </AvailabilityNotice>

            <div>
              <Button type="button" variant="primary" onClick={review} disabled={!selectedRoomIds.length || !weekdays.length}>
                Review
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
