import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Input, Switch } from "@/components/ui";
import { StaysSelect } from "../StaysForm";
import StaysCard from "../StaysCard";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { STAYS_KEYS, saveRatePlan } from "../../api";
import { getErrorMessage } from "@/lib/errorHandler";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { ChevronDown, CaretDown, CaretUp } from "@/features/stays/icons";
import type { RatePlan, RoomType } from "@/types/stays";

type OccupancyDiscount = NonNullable<RatePlan["occupancyDiscounts"]>[number];
type PricingMode = NonNullable<RatePlan["occupancyPricingMode"]>;

function rowsForBase(baseGuests: number, saved: OccupancyDiscount[] = []): OccupancyDiscount[] {
  return Array.from({ length: Math.max(0, baseGuests - 1) }, (_, index) => {
    const occupancy = index + 1;
    return (
      saved.find((row) => row.occupancy === occupancy) ?? {
        occupancy,
        value: 10,
        unit: "percent",
        enabled: true,
      }
    );
  });
}

function planMaxGuests(plan: RatePlan, room: RoomType) {
  const fallback = room.adults ?? plan.baseGuests ?? 1;
  return Math.max(plan.baseGuests || 1, plan.maxGuests ?? fallback);
}

function OccupancyStepper({
  id,
  value,
  max,
  onChange,
}: {
  id: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
}) {
  const numeric = Math.max(1, Number(value) || 1);
  const step = (delta: number) => onChange(String(Math.min(max, Math.max(1, numeric + delta))));

  return (
    <div className="relative w-full max-w-[10rem]">
      <Input
        id={id}
        type="number"
        min="1"
        max={String(max)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="absolute inset-y-1 right-1 flex w-6 flex-col justify-center gap-0.5">
        <button
          type="button"
          aria-label="Increase base occupancy"
          onClick={() => step(1)}
          className="grid h-4 place-items-center rounded-[3px] text-muted transition-colors hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CaretUp size={10} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Decrease base occupancy"
          onClick={() => step(-1)}
          className="grid h-4 place-items-center rounded-[3px] text-muted transition-colors hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CaretDown size={10} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function PlanPricingCard({
  plan,
  room,
  open,
  onToggle,
  onSave,
}: {
  plan: RatePlan;
  room: RoomType;
  open: boolean;
  onToggle: () => void;
  onSave: (plan: Partial<RatePlan>) => Promise<unknown>;
}) {
  const initialBase = Math.max(1, plan.baseGuests || 1);
  const initialMode: PricingMode = plan.occupancyPricingMode ?? "custom";
  const initialRows = rowsForBase(initialBase, plan.occupancyDiscounts ?? []);
  const [baseGuests, setBaseGuests] = useState(String(initialBase));
  const [mode, setMode] = useState<PricingMode>(initialMode);
  const [discounts, setDiscounts] = useState<OccupancyDiscount[]>(initialRows);
  const [saving, setSaving] = useState(false);

  const baseNumber = Math.max(1, Number(baseGuests) || 1);
  const maxGuests = Math.max(baseNumber, planMaxGuests(plan, room));
  const rows = rowsForBase(baseNumber, discounts);
  const recommended = mode === "recommended";
  const dirty =
    baseNumber !== initialBase ||
    mode !== initialMode ||
    JSON.stringify(rows) !== JSON.stringify(initialRows);

  const updateRow = (occupancy: number, patch: Partial<OccupancyDiscount>) => {
    setDiscounts((current) => {
      const baseRows = rowsForBase(baseNumber, current);
      return baseRows.map((row) => (row.occupancy === occupancy ? { ...row, ...patch } : row));
    });
  };

  const chooseMode = (next: PricingMode) => {
    setMode(next);
    if (next === "recommended") {
      setDiscounts(
        rowsForBase(baseNumber, []).map((row) => ({ ...row, value: 10, unit: "percent", enabled: true })),
      );
    }
  };

  const changeBase = (value: string) => {
    const next = Math.max(1, Number(value) || 1);
    setBaseGuests(value);
    if (mode === "recommended") {
      setDiscounts(rowsForBase(next, []).map((row) => ({ ...row, value: 10, unit: "percent", enabled: true })));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        id: plan.id,
        roomId: plan.roomId,
        baseGuests: baseNumber,
        maxGuests,
        occupancyPricingMode: mode,
        occupancyDiscounts: rows,
        singleGuestDiscount: rows.find((row) => row.occupancy === 1)?.value ?? 0,
      });
      toast.success(`${plan.name} guest pricing saved`);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not save the guest pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaysCard className="rounded-md p-0 shadow-none">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-6 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-sm text-ink/70">
            <span>Base occupancy: {plan.baseGuests || 1} guests</span>
            <span>Max occupancy: {planMaxGuests(plan, room)} guests</span>
          </div>
        </div>
        <ChevronDown
          size={20}
          aria-hidden="true"
          className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-hairline px-6 pb-6 pt-6">
          <h4 className="text-sm font-semibold text-ink">
            What&apos;s the base occupancy you want to use for this rate?
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            Base occupancy is how many guests you want to include for your normal price. The normal price is the
            baseline for your pricing per guest calculations.
          </p>
          <div className="mt-4">
            <label
              htmlFor={`base-occupancy-${plan.id}`}
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Base occupancy
            </label>
            <OccupancyStepper
              id={`base-occupancy-${plan.id}`}
              value={baseGuests}
              max={Math.max(maxGuests, 20)}
              onChange={changeBase}
            />
          </div>

          <h4 className="mt-6 text-sm font-semibold text-ink">Set prices per guest</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            Adjust your prices based on the number of guests in the group. You can manually set your prices for
            different occupancies, but we recommend automating the calculation. Do this by setting a fixed price per
            person, or by setting a percent increase for each additional guest.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1" role="radiogroup" aria-label="Pricing method">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name={`pricing-method-${plan.id}`}
                value="recommended"
                checked={recommended}
                onChange={() => chooseMode("recommended")}
                className="size-4 accent-brand"
              />
              Recommended
            </label>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name={`pricing-method-${plan.id}`}
                value="custom"
                checked={!recommended}
                onChange={() => chooseMode("custom")}
                className="size-4 accent-brand"
              />
              Custom
            </label>
          </div>
          <p className="mt-1 text-sm text-muted">Our recommendation is based on data from properties like yours.</p>

          <div className="mt-5 overflow-hidden rounded-md border border-hairline">
            <div className="grid grid-cols-1 gap-1 border-b border-hairline bg-surface px-4 py-3 text-sm font-semibold text-ink sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <span>Occupancy</span>
              <span>Price</span>
            </div>
            <div className="grid grid-cols-1 gap-1 bg-surface-soft px-4 py-3 text-sm text-ink sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4">
              <span>{baseNumber} guests</span>
              <span>Normal price</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.occupancy}
                className="grid grid-cols-1 gap-2 border-t border-hairline px-4 py-3 text-sm text-ink sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4"
              >
                <span>{row.occupancy} guest{row.occupancy === 1 ? "" : "s"}</span>
                <div className="flex flex-col gap-2">
                  <span className="shrink-0">Normal price reduced by</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-0 items-center">
                      <Input
                        type="number"
                        min="0"
                        aria-label={`Reduction for ${row.occupancy} guest${row.occupancy === 1 ? "" : "s"}`}
                        value={String(row.value)}
                        disabled={recommended || !row.enabled}
                        onChange={(event) =>
                          updateRow(row.occupancy, { value: Math.max(0, Number(event.target.value) || 0) })
                        }
                        className="h-10 w-24 rounded-r-none"
                      />
                      <div className="w-24 shrink-0">
                        <StaysSelect
                          aria-label={`Reduction unit for ${row.occupancy} guests`}
                          value={row.unit}
                          disabled={recommended || !row.enabled}
                          onChange={(event) =>
                            updateRow(row.occupancy, { unit: event.target.value as "percent" | "amount" })
                          }
                          options={[
                            { value: "percent", label: "%" },
                            { value: "amount", label: DEFAULT_CURRENCY },
                          ]}
                          className="h-10 rounded-l-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`Apply reduction for ${row.occupancy} guests`}
                        checked={row.enabled}
                        disabled={recommended}
                        onCheckedChange={(checked) => updateRow(row.occupancy, { enabled: checked })}
                      />
                      <span className="text-sm text-body">{row.enabled ? "On" : "Off"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Button
              type="button"
              variant="primary"
              onClick={save}
              loading={saving}
              disabled={!dirty}
              className="disabled:bg-surface-strong disabled:text-muted disabled:opacity-100 disabled:shadow-none"
            >
              Save changes
            </Button>
          </div>
        </div>
      )}
    </StaysCard>
  );
}

/** Guest occupancy pricing, grouped by room and rate plan. */
export default function PricingPerGuestSection() {
  const queryClient = useQueryClient();
  const { property, isLoading } = usePropertyContext();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [openPlanIds, setOpenPlanIds] = useState<Set<string>>(() => new Set());

  const plans = property?.ratePlans ?? [];
  const rooms = property?.rooms ?? [];
  const roomsWithPlans = rooms.filter((room) => plans.some((plan) => plan.roomId === room.id));
  const activeRoom =
    roomsWithPlans.find((room) => room.id === selectedRoomId) ?? roomsWithPlans[0] ?? null;
  const activePlans = activeRoom ? plans.filter((plan) => plan.roomId === activeRoom.id) : [];

  const save = async (plan: Partial<RatePlan>) => {
    if (!property) return;
    await saveRatePlan(property.id, plan);
    queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
    queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property.id) });
  };

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <div>
      {!property ? (
        <StaysCard>
          <p className="text-sm text-slate-500">Add a property before setting guest pricing.</p>
        </StaysCard>
      ) : roomsWithPlans.length === 0 ? (
        <StaysCard>
          <p className="text-sm text-slate-500">Add a rate plan before setting guest pricing.</p>
        </StaysCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(15rem,30%)_minmax(0,1fr)]">
          <div className="self-start rounded-md border border-hairline bg-surface p-1">
            {roomsWithPlans.map((room) => {
              const selected = room.id === activeRoom?.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setOpenPlanIds(new Set());
                  }}
                  aria-pressed={selected}
                  className={`flex min-h-20 w-full items-center border px-6 py-6 text-left text-sm transition-colors md:min-h-[8.75rem] ${
                    selected
                      ? "border-hairline-strong bg-surface-soft font-semibold text-brand-ink"
                      : "border-transparent text-body hover:bg-surface-soft"
                  }`}
                >
                  {room.name || room.kind || "Room"}
                </button>
              );
            })}
          </div>

          <div className="min-w-0">
            {activeRoom && (
              <>
                <h2 className="text-2xl font-bold text-ink">{activeRoom.name || activeRoom.kind}</h2>
                <div className="mt-5 space-y-6">
                  {activePlans.map((plan) => (
                    <PlanPricingCard
                      key={plan.id}
                      plan={plan}
                      room={activeRoom}
                      open={openPlanIds.has(plan.id)}
                      onToggle={() =>
                        setOpenPlanIds((current) => {
                          const next = new Set(current);
                          if (next.has(plan.id)) next.delete(plan.id);
                          else next.add(plan.id);
                          return next;
                        })
                      }
                      onSave={save}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
