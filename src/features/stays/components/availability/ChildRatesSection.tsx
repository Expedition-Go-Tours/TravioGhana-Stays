import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input } from "@/components/ui";
import { StaysSelect } from "../StaysForm";
import StaysCard from "../StaysCard";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { STAYS_KEYS, updateProperty } from "../../api";
import { getErrorMessage } from "@/lib/errorHandler";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import { Plus, Trash2, User, Users } from "@/features/stays/icons";
import type { ChildRateGroup } from "@/types/stays";

const INFANTS_ID = "infants";

function defaultChildGroups(): ChildRateGroup[] {
  return [
    {
      id: INFANTS_ID,
      label: "Infants",
      minAge: 0,
      maxAge: 2,
      rateType: "free",
      value: 0,
      unit: "night",
    },
    {
      id: "children",
      label: "Children",
      minAge: 3,
      maxAge: 17,
      rateType: "free",
      value: 0,
      unit: "night",
    },
  ];
}

function childGroupsFor(groups?: ChildRateGroup[]): ChildRateGroup[] {
  if (!groups?.length) return defaultChildGroups();
  const infants = groups.find((group) => group.id === INFANTS_ID || group.minAge === 0) ?? defaultChildGroups()[0];
  const children = groups
    .filter((group) => group.id !== infants.id)
    .sort((a, b) => a.minAge - b.minAge);
  return [infants, ...children];
}

const fallbackInfants: ChildRateGroup = {
  id: INFANTS_ID,
  label: "Infants",
  minAge: 0,
  maxAge: 2,
  rateType: "free",
  value: 0,
  unit: "night",
};

function groupRateLabel(group: ChildRateGroup) {
  if (group.rateType === "free") return "Free";
  if (group.rateType === "percentage") return `${group.value}% of rate`;
  return `${formatMoney(group.value, DEFAULT_CURRENCY)} per ${group.unit}`;
}

function ageLabel(group: ChildRateGroup) {
  return group.minAge === group.maxAge
    ? `${group.minAge} year${group.minAge === 1 ? "" : "s"}`
    : `${group.minAge}–${group.maxAge} years`;
}

function AgeRange({
  min,
  max,
  minLimit,
  maxLimit,
  disabled,
  label,
  onChange,
}: {
  min: number;
  max: number;
  minLimit: number;
  maxLimit: number;
  disabled?: boolean;
  label: string;
  onChange: (min: number, max: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);
  const span = Math.max(1, maxLimit - minLimit);
  const percent = (value: number) => ((value - minLimit) / span) * 100;

  const moveTo = (clientX: number, thumb: "min" | "max") => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const raw = minLimit + ((clientX - rect.left) / rect.width) * span;
    const value = Math.round(raw);
    if (thumb === "min") onChange(Math.max(minLimit, Math.min(value, max - 1)), max);
    else onChange(min, Math.min(maxLimit, Math.max(value, min + 1)));
  };

  const nudge = (thumb: "min" | "max", delta: number) => {
    if (thumb === "min") onChange(Math.max(minLimit, Math.min(min + delta, max - 1)), max);
    else onChange(min, Math.min(maxLimit, Math.max(max + delta, min + 1)));
  };

  const thumb = (which: "min" | "max", value: number) => (
    <button
      type="button"
      role="slider"
      aria-label={`${label} ${which === "min" ? "minimum" : "maximum"} age`}
      aria-valuemin={minLimit}
      aria-valuemax={maxLimit}
      aria-valuenow={value}
      disabled={disabled}
      onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(which);
      }}
      onPointerMove={(event) => {
        if (dragging === which) moveTo(event.clientX, which);
      }}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          nudge(which, -1);
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          nudge(which, 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          nudge(which, minLimit - value);
        } else if (event.key === "End") {
          event.preventDefault();
          nudge(which, maxLimit - value);
        }
      }}
      className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        disabled ? "cursor-not-allowed bg-slate-400" : "cursor-grab bg-brand active:cursor-grabbing"
      }`}
      style={{ left: `${percent(value)}%` }}
    />
  );

  return (
    <div ref={trackRef} className="relative h-6 w-full">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-strong" />
      {!disabled && (
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${percent(min)}%`, right: `${100 - percent(max)}%` }}
        />
      )}
      {thumb("min", min)}
      {thumb("max", max)}
    </div>
  );
}

function ChildGroupRateRow({
  group,
  minLimit,
  maxLimit,
  onChange,
  onDelete,
  canDelete,
}: {
  group: ChildRateGroup;
  minLimit: number;
  maxLimit: number;
  onChange: (patch: Partial<ChildRateGroup>) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="grid gap-4 border-b border-hairline px-4 py-5 last:border-b-0 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-start">
      <div>
        <p className="text-sm font-semibold text-ink">{group.label}</p>
        <p className="mt-0.5 text-sm text-muted">({ageLabel(group)})</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 sm:max-w-[22rem]">
          <AgeRange
            label={group.label}
            min={group.minAge}
            max={group.maxAge}
            minLimit={minLimit}
            maxLimit={maxLimit}
            disabled={minLimit === maxLimit}
            onChange={(min, max) => onChange({ minAge: min, maxAge: max })}
          />
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-[8.5rem]">
            <Field label="Rate">
              <StaysSelect
                aria-label={`${group.label} rate`}
                value={group.rateType}
                onChange={(event) =>
                  onChange({ rateType: event.target.value as ChildRateGroup["rateType"] })
                }
                options={[
                  { value: "free", label: "Free" },
                  { value: "fixed", label: "Fixed amount" },
                  { value: "percentage", label: "Percentage" },
                ]}
              />
            </Field>
          </div>
          <div className="w-[7.5rem]">
            <Field label="Amount">
              <Input
                type="number"
                min="0"
                aria-label={`${group.label} amount`}
                value={String(group.value)}
                disabled={group.rateType === "free"}
                onChange={(event) => onChange({ value: Math.max(0, Number(event.target.value) || 0) })}
                className="disabled:bg-surface-soft"
              />
            </Field>
          </div>
          <div className="w-[8.5rem]">
            <Field label="Unit">
              <StaysSelect
                aria-label={`${group.label} unit`}
                value={group.unit}
                disabled={group.rateType === "free"}
                onChange={(event) => onChange({ unit: event.target.value as "night" | "stay" })}
                options={[
                  { value: "night", label: "Per night" },
                  { value: "stay", label: "Per stay" },
                ]}
              />
            </Field>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mt-6 inline-flex h-9 items-center gap-1.5 text-sm font-medium text-danger hover:underline"
            >
              <Trash2 size={15} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChildRatesSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ChildRateGroup[]>(defaultChildGroups);
  const [saving, setSaving] = useState(false);

  const savedGroups = childGroupsFor(property?.childRateGroups);
  const infants = draft.find((group) => group.id === INFANTS_ID) ?? fallbackInfants;
  const childGroups = draft
    .filter((group) => group.id !== INFANTS_ID)
    .sort((a, b) => a.minAge - b.minAge);

  const openEditor = () => {
    setDraft(childGroupsFor(property?.childRateGroups));
    setOpen(true);
  };

  const updateGroup = (id: string, patch: Partial<ChildRateGroup>) => {
    setDraft((current) => {
      if (id === INFANTS_ID) return current;
      return current.map((group) => {
        if (group.id !== id) return group;
        let minAge = patch.minAge ?? group.minAge;
        let maxAge = patch.maxAge ?? group.maxAge;

        if (patch.minAge !== undefined) {
          minAge = Math.max(3, Math.min(minAge, 16));
        }
        if (patch.maxAge !== undefined) {
          maxAge = Math.max(4, Math.min(maxAge, 17));
        }
        if (minAge >= maxAge) {
          if (patch.minAge !== undefined) minAge = maxAge - 1;
          else maxAge = minAge + 1;
        }

        return { ...group, ...patch, minAge, maxAge };
      });
    });
  };

  const addGroup = () => {
    setDraft((current) => {
      const sorted = [...current].sort((a, b) => a.minAge - b.minAge);
      const children = sorted.filter((group) => group.id !== INFANTS_ID);
      if (children.length >= 3) return current;
      if (!children.length) {
        return [
          ...sorted,
          {
            id: `child-${Date.now().toString(36)}`,
            label: "Children",
            minAge: 3,
            maxAge: 17,
            rateType: "free",
            value: 0,
            unit: "night",
          },
        ];
      }
      const largest = [...children].sort(
        (a, b) => b.maxAge - b.minAge - (a.maxAge - a.minAge),
      )[0];
      if (!largest || largest.maxAge - largest.minAge < 1) return current;
      const midpoint = Math.floor((largest.minAge + largest.maxAge) / 2);
      const next = sorted.map((group) =>
        group.id === largest.id ? { ...group, maxAge: midpoint } : group,
      );
      next.push({
        ...largest,
        id: `child-${Date.now().toString(36)}`,
        minAge: midpoint + 1,
        maxAge: largest.maxAge,
      });
      return next.sort((a, b) => a.minAge - b.minAge);
    });
  };

  const deleteGroup = (id: string) => {
    setDraft((current) => {
      if (id === INFANTS_ID) return current;
      const infantsGroup = current.find((group) => group.id === INFANTS_ID);
      const children = [...current]
        .filter((group) => group.id !== INFANTS_ID)
        .sort((a, b) => a.minAge - b.minAge);
      const index = children.findIndex((group) => group.id === id);
      if (index < 0) return current;
      const removed = children[index];
      const nextChildren = children.filter((group) => group.id !== id);
      if (index > 0) {
        nextChildren[index - 1] = { ...nextChildren[index - 1], maxAge: removed.maxAge };
      } else if (nextChildren[0]) {
        nextChildren[0] = { ...nextChildren[0], minAge: removed.minAge };
      }
      return [...(infantsGroup ? [infantsGroup] : []), ...nextChildren];
    });
  };

  const validChildren =
    childGroups.length > 0 &&
    childGroups[0].minAge === 3 &&
    childGroups.at(-1)?.maxAge === 17 &&
    childGroups.every((group, index) => {
      const next = childGroups[index + 1];
      return !next || next.minAge === group.maxAge + 1;
    });

  const dirty = JSON.stringify([infants, ...childGroups]) !== JSON.stringify(savedGroups);
  const confirm = async () => {
    if (!property || !validChildren) return;
    setSaving(true);
    try {
      await updateProperty(property.id, { childRateGroups: [infants, ...childGroups] });
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property.id) });
      toast.success("Child rates saved");
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not save the child rates");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <StaysCard className="min-h-[220px] animate-pulse bg-white/60" />;

  return (
    <div>
      <AvailabilityPropertyBar properties={properties} property={property} onSelect={selectProperty} />

      {!property ? (
        <StaysCard>
          <p className="text-sm text-slate-500">Add a property before setting child rates.</p>
        </StaysCard>
      ) : (
        <StaysCard className="rounded-md shadow-none">
          <h2 className="text-xl font-bold text-ink">Default child rates</h2>
          <p className="mt-1 text-sm text-muted">This is how you usually charge infants and children at your property.</p>

          <div className="mt-4 rounded-md border border-hairline bg-surface-soft px-4 py-2">
            {savedGroups.map((group, index) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {index === 0 ? (
                    <Users size={18} className="shrink-0 text-muted" aria-hidden="true" />
                  ) : (
                    <User size={18} className="shrink-0 text-muted" aria-hidden="true" />
                  )}
                  <p className="text-sm text-ink">
                    <span className="font-medium">{group.label}</span>{" "}
                    <span className="text-muted">({ageLabel(group)})</span>
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-ink">{groupRateLabel(group)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={openEditor}>
              Edit age groups and rates
            </Button>
          </div>
        </StaysCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="lg"
          className="max-w-[62rem]"
          hideClose
          title="Edit age groups and rates"
          description="Ages of the infant group can't be edited. You can create up to 3 groups for ages 3–17."
          footer={
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="primary" loading={saving} onClick={confirm} disabled={!dirty || !validChildren}>
                Confirm
              </Button>
            </DialogFooter>
          }
        >
          <div className="overflow-hidden rounded-md border border-hairline">
            <div className="grid gap-4 border-b border-hairline px-4 py-5 lg:grid-cols-[10rem_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-semibold text-ink">{infants.label}</p>
                <p className="mt-0.5 text-sm text-muted">({ageLabel(infants)})</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0 sm:max-w-[22rem]">
                  <AgeRange
                    label={infants.label}
                    min={infants.minAge}
                    max={infants.maxAge}
                    minLimit={0}
                    maxLimit={2}
                    disabled
                    onChange={() => undefined}
                  />
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="w-[8.5rem]">
                    <Field label="Rate">
                      <StaysSelect
                        aria-label="Infants rate"
                        value="free"
                        disabled
                        onChange={() => undefined}
                        options={[{ value: "free", label: "Free" }]}
                      />
                    </Field>
                  </div>
                  <div className="w-[7.5rem]">
                    <Field label="Amount">
                      <Input value="0" disabled aria-label="Infants amount" />
                    </Field>
                  </div>
                  <div className="w-[8.5rem]">
                    <Field label="Unit">
                      <StaysSelect
                        aria-label="Infants unit"
                        value="night"
                        disabled
                        onChange={() => undefined}
                        options={[{ value: "night", label: "Per night" }]}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {childGroups.map((group) => (
              <ChildGroupRateRow
                key={group.id}
                group={group}
                minLimit={3}
                maxLimit={17}
                canDelete
                onChange={(patch) => updateGroup(group.id, patch)}
                onDelete={() => deleteGroup(group.id)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addGroup}
            disabled={childGroups.length >= 3}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-ink hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            <Plus size={15} />
            Add age group
          </button>
          {!validChildren && (
            <p className="mt-2 text-sm text-danger">
              Age groups must cover ages 3–17 without gaps or overlaps.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
