import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Checkbox, Field, Input } from "@/components/ui";
import DatePicker from "@/components/forms/DatePicker";
import StaysModal from "../StaysModal";
import { StaysSelect } from "../StaysForm";
import StaysCard from "../StaysCard";
import AvailabilityPropertyBar from "./AvailabilityPropertyBar";
import { usePropertyContext } from "../../hooks/usePropertyContext";
import { STAYS_KEYS, updateProperty } from "../../api";
import { getErrorMessage } from "@/lib/errorHandler";
import type {
  DynamicRestrictionPriceChange,
  DynamicRestrictionRule,
  DynamicRestrictionScope,
  DynamicRestrictions,
} from "@/types/stays";

type RuleKind = "unsold" | "gap";
type EditKind = "period" | "scope" | "end" | null;

const PRICE_CHANGES = [
  { value: "none", label: "No price change" },
  { value: "increase-percent", label: "Increase by a percentage" },
  { value: "increase-amount", label: "Increase by a fixed amount" },
  { value: "decrease-percent", label: "Decrease by a percentage" },
  { value: "decrease-amount", label: "Decrease by a fixed amount" },
] as const;

const MIN_ADVANCE_OPTIONS = [1, 2, 3, 5, 7, 14, 21, 30, 60, 90].map((days) => ({
  value: String(days),
  label: `${days} day${days === 1 ? "" : "s"}`,
}));

function blankScope(): DynamicRestrictionScope {
  return { allRooms: true, allRatePlans: true, roomIds: [], ratePlanIds: [] };
}

function blankRule(): DynamicRestrictionRule {
  return {
    minStay: 1,
    minAdvanceDays: null,
    priceChange: { mode: "none", unit: "percent", value: 0 },
    applicablePeriodDays: 60,
    scope: blankScope(),
    endMode: "until-off",
    endDate: null,
  };
}

function rulesFor(property: { dynamicRestrictions?: DynamicRestrictions } | null): DynamicRestrictions {
  const saved = property?.dynamicRestrictions;
  return {
    unsold: {
      ...blankRule(),
      ...(saved?.unsold ?? {}),
      scope: { ...blankScope(), ...(saved?.unsold?.scope ?? {}) },
      priceChange: { ...blankRule().priceChange, ...(saved?.unsold?.priceChange ?? {}) },
    },
    gap: {
      ...blankRule(),
      ...(saved?.gap ?? {}),
      scope: { ...blankScope(), ...(saved?.gap?.scope ?? {}) },
      priceChange: { ...blankRule().priceChange, ...(saved?.gap?.priceChange ?? {}) },
    },
  };
}

function priceChangeValue(change: DynamicRestrictionPriceChange) {
  if (change.mode === "none") return "none";
  return `${change.mode}-${change.unit === "percent" ? "percent" : "amount"}`;
}

function priceChangeFromValue(value: string, current: DynamicRestrictionPriceChange): DynamicRestrictionPriceChange {
  if (value === "none") return { ...current, mode: "none" };
  const [mode, unit] = value.split("-") as ["increase" | "decrease", "percent" | "amount"];
  return { ...current, mode, unit };
}

function priceChangeSummary(change: DynamicRestrictionPriceChange) {
  if (change.mode === "none" || !change.value) return "No price change";
  return `${change.mode === "increase" ? "Increase" : "Decrease"} by ${change.value}${
    change.unit === "percent" ? "%" : " USD"
  }`;
}

function RuleRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-sm text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Edit
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-hairline py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-ink sm:max-w-[70%] sm:text-right">{value}</dd>
    </div>
  );
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm text-body">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 accent-brand"
      />
      <span>{children}</span>
    </label>
  );
}

export default function RestrictionRulesSection() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const propertyId = property?.id ?? null;
  const [kind, setKind] = useState<RuleKind>("unsold");
  const [draftState, setDraftState] = useState<{ propertyId: string | null; rules: DynamicRestrictions }>({
    propertyId: null,
    rules: rulesFor(null),
  });
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<EditKind>(null);
  const [periodValue, setPeriodValue] = useState("60");
  const [scopeDraft, setScopeDraft] = useState<DynamicRestrictionScope>(blankScope);
  const [endModeDraft, setEndModeDraft] = useState<"until-off" | "date">("until-off");
  const [endDateDraft, setEndDateDraft] = useState("");

  const rooms = property?.rooms ?? [];
  const plans = property?.ratePlans ?? [];
  const draft = draftState.propertyId === propertyId ? draftState.rules : rulesFor(property);
  const reviewing = reviewFor === propertyId;
  const rule = draft[kind];
  const title = kind === "unsold" ? "Unsold nights" : "Gap nights";

  const updateDraft = (updater: (current: DynamicRestrictions) => DynamicRestrictions) => {
    setDraftState((current) => {
      const base = current.propertyId === propertyId ? current.rules : rulesFor(property);
      return { propertyId, rules: updater(base) };
    });
  };

  const updateRule = (patch: Partial<DynamicRestrictionRule>) =>
    updateDraft((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));

  const scopeSummary = useMemo(() => {
    if (rule.scope.allRooms && rule.scope.allRatePlans) return "All room types, all rate plans";
    const roomCount = rule.scope.allRooms ? rooms.length : rule.scope.roomIds.length;
    const planCount = rule.scope.allRatePlans ? plans.length : rule.scope.ratePlanIds.length;
    return `${roomCount} room type${roomCount === 1 ? "" : "s"}, ${planCount} rate plan${
      planCount === 1 ? "" : "s"
    }`;
  }, [rule.scope, rooms.length, plans.length]);

  const endSummary =
    rule.endMode === "date" && rule.endDate ? `Ends on ${rule.endDate}` : "Apply until I turn it off";

  const openEdit = (next: Exclude<EditKind, null>) => {
    setPeriodValue(String(rule.applicablePeriodDays));
    setScopeDraft({
      allRooms: rule.scope.allRooms,
      allRatePlans: rule.scope.allRatePlans,
      roomIds: [...rule.scope.roomIds],
      ratePlanIds: [...rule.scope.ratePlanIds],
    });
    setEndModeDraft(rule.endMode);
    setEndDateDraft(rule.endDate ?? "");
    setEdit(next);
  };

  const savePeriod = () => {
    updateRule({ applicablePeriodDays: Math.max(1, Number(periodValue) || 1) });
    setEdit(null);
  };

  const saveScope = () => {
    updateRule({ scope: scopeDraft });
    setEdit(null);
  };

  const saveEnd = () => {
    updateRule({
      endMode: endModeDraft,
      endDate: endModeDraft === "date" ? endDateDraft || null : null,
    });
    setEdit(null);
  };

  const submit = async () => {
    if (!property) return;
    setBusy(true);
    try {
      await updateProperty(property.id, { dynamicRestrictions: draft });
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.property(property.id) });
      queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });
      toast.success(`${title} rule saved`);
      setReviewFor(null);
    } catch (error) {
      toast.error(getErrorMessage(error) || "Could not save the dynamic restriction rule");
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
          <p className="text-sm text-slate-500">Add a property before creating dynamic restriction rules.</p>
        </StaysCard>
      ) : (
        <div className="space-y-5">
          <StaysCard className="rounded-md shadow-none">
            <h2 className="text-xl font-bold text-ink">Fill more empty nights with bookings that suit your needs</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Restrictions can give you control over your costs and bookings, but they can also make your property
              less visible to guests. You no longer have to make these tradeoffs. Save time and appear in more
              searches by automatically adjusting your restrictions and prices based on your business needs.
            </p>
          </StaysCard>

          <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="self-start rounded-md border border-hairline bg-surface p-1">
              {(["unsold", "gap"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setKind(value);
                    setReviewFor(null);
                  }}
                  aria-pressed={kind === value}
                  className={`w-full border px-4 py-3 text-left text-sm transition-colors ${
                    kind === value
                      ? "border-brand bg-surface-strong font-semibold text-ink"
                      : "border-transparent text-body hover:bg-surface-soft"
                  }`}
                >
                  {value === "unsold" ? "Unsold nights" : "Gap nights"}
                </button>
              ))}
            </div>

            <div className="min-w-0 space-y-5">
              <h2 className="text-xl font-bold text-ink">{title}</h2>

              {reviewing ? (
                <StaysCard className="rounded-md shadow-none">
                  <h3 className="text-lg font-semibold text-ink">Review your {title.toLowerCase()} rule</h3>
                  <dl className="mt-4 rounded-md border border-hairline px-4">
                    <SummaryRow
                      label="Restrictions"
                      value={
                        `${rule.minStay} night${rule.minStay === 1 ? "" : "s"} minimum` +
                        (kind === "unsold" && rule.minAdvanceDays
                          ? `, ${rule.minAdvanceDays} days advance booking`
                          : "")
                      }
                    />
                    <SummaryRow label="Price" value={priceChangeSummary(rule.priceChange)} />
                    <SummaryRow label="Applicable period" value={`${rule.applicablePeriodDays} days`} />
                    <SummaryRow label="Room types and rate plans" value={scopeSummary} />
                    <SummaryRow label="End date" value={endSummary} />
                  </dl>
                  <div className="mt-5 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-between">
                    <Button type="button" onClick={() => setReviewFor(null)} disabled={busy}>
                      Back
                    </Button>
                    <Button type="button" variant="primary" loading={busy} onClick={submit}>
                      Save rule
                    </Button>
                  </div>
                </StaysCard>
              ) : (
                <>
                  <StaysCard className="rounded-md shadow-none">
                    <h3 className="text-lg font-semibold text-ink">What are “{kind} nights”?</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/80">
                      {kind === "unsold"
                        ? "“Unsold nights” are upcoming unsold nights that have restrictions. Guests may not be able to see and book your property on these nights because of your restrictions."
                        : "“Gap nights” are nights guests can’t book because of your length of stay restriction. For example, if you have 2 consecutive nights left and you’ve set a restriction of 3 nights, guests won’t be able to book those 2 nights."}
                    </p>
                    <Link
                      to="/stays/availability?section=calendar"
                      className="mt-3 inline-block text-sm font-medium text-brand-ink underline-offset-2 hover:underline"
                    >
                      View current {kind} nights
                    </Link>
                  </StaysCard>

                  <div>
                    <h2 className="text-xl font-bold text-ink">Create a rule for {kind} nights</h2>
                    <p className="mt-1 text-sm text-ink/70">
                      {kind === "unsold"
                        ? "Set up how your restrictions will be relaxed for unsold nights."
                        : "Set up how your length of stay restriction will be relaxed for gap nights."}
                    </p>
                  </div>

                  <StaysCard className="rounded-md shadow-none">
                    <h3 className="text-lg font-semibold text-ink">Restrictions</h3>
                    <h4 className="mt-4 text-sm font-semibold text-ink">
                      What will your restrictions be for {kind} nights?
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {kind === "unsold"
                        ? "Select how long guests need to stay and how far in advance they need to book."
                        : "Select how long guests need to stay when they book gap nights."}
                    </p>
                    <div className={`mt-4 grid gap-4 ${kind === "unsold" ? "sm:grid-cols-2" : "sm:max-w-[18rem]"}`}>
                      <Field label="Minimum length of stay">
                        <StaysSelect
                          aria-label="Minimum length of stay"
                          value={String(rule.minStay)}
                          onChange={(event) => updateRule({ minStay: Math.max(1, Number(event.target.value) || 1) })}
                          options={Array.from({ length: 30 }, (_, index) => index + 1).map((nights) => ({
                            value: String(nights),
                            label: `${nights} night${nights === 1 ? "" : "s"}`,
                          }))}
                        />
                      </Field>
                      {kind === "unsold" && (
                        <Field label="Minimum advance reservation (optional)">
                          <StaysSelect
                            aria-label="Minimum advance reservation"
                            value={rule.minAdvanceDays == null ? "none" : String(rule.minAdvanceDays)}
                            onChange={(event) =>
                              updateRule({
                                minAdvanceDays:
                                  event.target.value === "none" ? null : Number(event.target.value),
                              })
                            }
                            options={[{ value: "none", label: "No minimum" }, ...MIN_ADVANCE_OPTIONS]}
                          />
                        </Field>
                      )}
                    </div>
                  </StaysCard>

                  <StaysCard className="rounded-md shadow-none">
                    <h3 className="text-lg font-semibold text-ink">Price</h3>
                    <h4 className="mt-4 text-sm font-semibold text-ink">
                      Would you like a price change {kind === "unsold" ? "when restrictions are relaxed" : "for gap nights"}?
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      For example, you can increase your price when guests book with relaxed restrictions.
                    </p>
                    <div className="mt-4 grid gap-3 sm:max-w-[22rem]">
                      <Field label="Price change">
                        <StaysSelect
                          aria-label="Price change"
                          value={priceChangeValue(rule.priceChange)}
                          onChange={(event) =>
                            updateRule({ priceChange: priceChangeFromValue(event.target.value, rule.priceChange) })
                          }
                          options={PRICE_CHANGES}
                        />
                      </Field>
                      {rule.priceChange.mode !== "none" && (
                        <Field label={rule.priceChange.unit === "percent" ? "Percentage" : "Amount"}>
                          <Input
                            type="number"
                            min="0"
                            value={String(rule.priceChange.value)}
                            trailing={rule.priceChange.unit === "percent" ? "%" : undefined}
                            onChange={(event) =>
                              updateRule({
                                priceChange: {
                                  ...rule.priceChange,
                                  value: Math.max(0, Number(event.target.value) || 0),
                                },
                              })
                            }
                          />
                        </Field>
                      )}
                    </div>
                  </StaysCard>

                  <StaysCard className="rounded-md shadow-none">
                    <h3 className="text-lg font-semibold text-ink">Customise your rule</h3>
                    <div className="mt-2">
                      <RuleRow
                        label="Applicable period"
                        value={`${rule.applicablePeriodDays} days`}
                        onEdit={() => openEdit("period")}
                      />
                      <RuleRow
                        label="Room types and rate plans"
                        value={scopeSummary}
                        onEdit={() => openEdit("scope")}
                      />
                      <RuleRow label="End date" value={endSummary} onEdit={() => openEdit("end")} />
                    </div>
                  </StaysCard>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setReviewFor(propertyId)}
                    disabled={!rule.minStay}
                  >
                    Continue to review
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <StaysModal
        open={edit === "period"}
        onOpenChange={(open) => !open && setEdit(null)}
        title="Applicable period"
        description="How far ahead should this rule look for unsold or gap nights?"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={savePeriod}>
              Save
            </Button>
          </div>
        }
      >
        <Field label="Days">
          <Input
            type="number"
            min="1"
            value={periodValue}
            onChange={(event) => setPeriodValue(event.target.value)}
          />
        </Field>
      </StaysModal>

      <StaysModal
        open={edit === "scope"}
        onOpenChange={(open) => !open && setEdit(null)}
        title="Room types and rate plans"
        description="Choose where this dynamic restriction rule applies."
        wide
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={saveScope}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <Checkbox
              checked={scopeDraft.allRooms}
              onChange={() => setScopeDraft((current) => ({ ...current, allRooms: !current.allRooms }))}
              label="All room types"
            />
            {!scopeDraft.allRooms && (
              <div className="mt-1 grid gap-1 rounded-md border border-hairline p-2 sm:grid-cols-2">
                {rooms.map((room) => (
                  <Checkbox
                    key={room.id}
                    checked={scopeDraft.roomIds.includes(room.id)}
                    onChange={() =>
                      setScopeDraft((current) => ({
                        ...current,
                        roomIds: current.roomIds.includes(room.id)
                          ? current.roomIds.filter((id) => id !== room.id)
                          : [...current.roomIds, room.id],
                      }))
                    }
                    label={room.name || room.kind || "Room"}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <Checkbox
              checked={scopeDraft.allRatePlans}
              onChange={() => setScopeDraft((current) => ({ ...current, allRatePlans: !current.allRatePlans }))}
              label="All rate plans"
            />
            {!scopeDraft.allRatePlans && (
              <div className="mt-1 grid gap-1 rounded-md border border-hairline p-2 sm:grid-cols-2">
                {plans.map((plan) => (
                  <Checkbox
                    key={plan.id}
                    checked={scopeDraft.ratePlanIds.includes(plan.id)}
                    onChange={() =>
                      setScopeDraft((current) => ({
                        ...current,
                        ratePlanIds: current.ratePlanIds.includes(plan.id)
                          ? current.ratePlanIds.filter((id) => id !== plan.id)
                          : [...current.ratePlanIds, plan.id],
                      }))
                    }
                    label={plan.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </StaysModal>

      <StaysModal
        open={edit === "end"}
        onOpenChange={(open) => !open && setEdit(null)}
        title="End date"
        description="Choose when this rule should stop applying."
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={saveEnd} disabled={endModeDraft === "date" && !endDateDraft}>
              Save
            </Button>
          </div>
        }
      >
        <div className="grid gap-1">
          <RadioOption
            name="dynamic-rule-end"
            value="until-off"
            checked={endModeDraft === "until-off"}
            onChange={() => setEndModeDraft("until-off")}
          >
            Apply until I turn it off
          </RadioOption>
          <RadioOption
            name="dynamic-rule-end"
            value="date"
            checked={endModeDraft === "date"}
            onChange={() => setEndModeDraft("date")}
          >
            End on a specific date
          </RadioOption>
          {endModeDraft === "date" && (
            <div className="mt-2 sm:max-w-[14rem]">
              <Field label="End date">
                <DatePicker value={endDateDraft} onChange={(value) => setEndDateDraft(value)} />
              </Field>
            </div>
          )}
        </div>
      </StaysModal>
    </div>
  );
}
