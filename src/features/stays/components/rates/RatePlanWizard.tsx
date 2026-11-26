import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, Checkbox, Field, Input } from "@/components/ui";
import { Plus } from "@/features/stays/icons";
import { StaysSelect } from "../StaysForm";
import ValueAddCreateSheet from "./ValueAddCreateSheet";
import { MEAL_PLANS } from "../../config/constants";
import {
  type RatePlanCancellation,
  type RatePlanTemplate,
  cancellationFields,
  cancellationLabel,
} from "../../config/ratePlanTemplates";
import { defaultPlanForRoom, planPrice } from "../../utils/ratePlans";
import { formatMoney } from "../../utils/money";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Property, RatePlan, ValueAdd } from "@/types/stays";

function WizardStep({
  number,
  last,
  title,
  description,
  children,
}: {
  number: number;
  last?: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3 sm:grid-cols-[32px_1fr] sm:gap-4">
      <div className="flex flex-col items-center">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
          {number}
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden="true" />}
      </div>
      <div className={cn("min-w-0", !last && "pb-7")}>
        <h3 className="text-sm font-semibold leading-snug text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-brand"
      />
      <span className="min-w-0">
        <span className="block text-sm text-body">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
    </label>
  );
}

function Callout({ tone = "info", title, children }: { tone?: "info" | "warning" | "success"; title?: string; children: ReactNode }) {
  const styles = {
    info: cn(
      "border-slate-200 bg-[#f2f2f2] text-slate-800",
      "before:border-slate-200 before:bg-[#f2f2f2]",
      "dark:border-hairline dark:bg-surface-strong dark:text-body",
      "dark:before:border-hairline dark:before:bg-surface-strong",
    ),
    warning: cn(
      "border-amber-200 bg-amber-50 text-amber-900",
      "before:border-amber-200 before:bg-amber-50",
      "dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
      "dark:before:border-amber-400/30 dark:before:bg-amber-400/10",
    ),
    success: cn(
      "border-emerald-200 bg-emerald-50 text-emerald-900",
      "before:border-emerald-200 before:bg-emerald-50",
      "dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
      "dark:before:border-emerald-400/30 dark:before:bg-emerald-400/10",
    ),
  }[tone];
  return (
    <div
      className={cn(
        "relative mt-3 rounded-[2px] border px-4 py-3.5 text-body leading-relaxed",
        "before:absolute before:-top-[5px] before:left-8 before:h-2.5 before:w-2.5 before:rotate-45",
        "before:border-l before:border-t",
        styles,
      )}
    >
      {title && <p className="mb-1.5 text-sm font-semibold">{title}</p>}
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-hairline py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-ink sm:text-right">{value}</dd>
    </div>
  );
}

/**
 * One template's numbered wizard. It owns the answers, builds one plan per
 * selected room, and only hands them to the page after the review step.
 */
export default function RatePlanWizard({
  template,
  property,
  onClose,
  onCreate,
}: {
  template: RatePlanTemplate;
  property: Property;
  onClose: () => void;
  onCreate: (plans: Array<Partial<RatePlan>>) => Promise<void>;
}) {
  const rooms = property.rooms || [];
  const plans = property.ratePlans || [];
  const savedValueAdds = useMemo(() => property.valueAdds || [], [property.valueAdds]);

  const [cancellation, setCancellation] = useState<RatePlanCancellation>(template.defaultCancellation);
  const [mealMode, setMealMode] = useState<"no" | "yes">("no");
  const [meal, setMeal] = useState("Breakfast included");
  const [valueAddIds, setValueAddIds] = useState<string[]>([]);
  const [createdValueAdds, setCreatedValueAdds] = useState<ValueAdd[]>([]);
  const [valueAddSheetOpen, setValueAddSheetOpen] = useState(false);
  const [minStayEnabled, setMinStayEnabled] = useState(Boolean(template.fixedMinStay));
  const [minStay, setMinStay] = useState(String(template.fixedMinStay || 1));
  const [bookingWindow, setBookingWindow] = useState<"anytime" | "min-days">(
    template.defaultMinAdvanceDays > 0 ? "min-days" : "anytime",
  );
  const [minAdvanceDays, setMinAdvanceDays] = useState(String(template.defaultMinAdvanceDays || 1));
  const [manageMode, setManageMode] = useState<"new" | "existing">(
    plans.length ? template.defaultManagement : "new",
  );
  const [basePlanId, setBasePlanId] = useState(plans[0]?.id || "");
  const [direction, setDirection] = useState<"cheaper" | "more">(
    template.defaultAdjustmentPct < 0 ? "cheaper" : "more",
  );
  const [adjustment, setAdjustment] = useState(String(Math.abs(template.defaultAdjustmentPct)));
  const [roomIds, setRoomIds] = useState<string[]>(rooms.map((room) => room.id));
  const [name, setName] = useState(template.defaultName);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const valueAdds = useMemo(() => {
    const known = new Set(savedValueAdds.map((item) => item.id));
    return [...savedValueAdds, ...createdValueAdds.filter((item) => !known.has(item.id))];
  }, [savedValueAdds, createdValueAdds]);

  const roomNames = new Map(rooms.map((room) => [room.id, room.name || room.kind || "Room"]));
  const basePlan = plans.find((plan) => plan.id === basePlanId) || plans[0] || null;
  const selectedRooms = rooms.filter((room) => roomIds.includes(room.id));
  const signedAdjustment =
    manageMode === "new"
      ? 0
      : (template.adjustmentKind === "choice"
          ? direction === "cheaper"
            ? -1
            : 1
          : template.defaultAdjustmentPct < 0
            ? -1
            : 1) * Math.abs(Number(adjustment) || 0);

  const effectiveMinStay = template.fixedMinStay ?? (minStayEnabled ? Math.max(1, Number(minStay) || 1) : 1);
  const effectiveMinAdvanceDays =
    bookingWindow === "min-days" ? Math.max(1, Number(minAdvanceDays) || 1) : 0;

  const toggleRoom = (roomId: string) =>
    setRoomIds((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId],
    );

  const toggleValueAdd = (id: string) => {
    setValueAddIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 5) {
        toast.error("Each rate plan can include up to five value adds");
        return current;
      }
      return [...current, id];
    });
  };

  const review = () => {
    if (!roomIds.length) {
      toast.error("Choose at least one room type");
      return;
    }
    if (!name.trim()) {
      toast.error("Name the rate plan");
      return;
    }
    if (manageMode === "existing" && !basePlan) {
      toast.error("Choose the rate plan to base this on");
      return;
    }
    setReviewing(true);
  };

  const buildPlans = (): Array<Partial<RatePlan>> => {
    const cancellationValues = cancellationFields(cancellation);
    return selectedRooms.map((room) => {
      const seed = defaultPlanForRoom(room);
      const source =
        manageMode === "existing"
          ? plans.find((plan) => plan.id === basePlanId && plan.roomId === room.id) ||
            plans.find((plan) => plan.roomId === room.id) ||
            null
          : plans.find((plan) => plan.roomId === room.id) || null;
      const basePrice = source ? planPrice(source, room, plans) : Number(room.price) || 0;
      const { id: _seedId, ...seedWithoutId } = seed;
      const { id: _sourceId, ...sourceWithoutId } = source || {};
      return {
        ...seedWithoutId,
        ...sourceWithoutId,
        id: undefined,
        roomId: room.id,
        name: name.trim(),
        templateKey: template.key,
        pricingModel: manageMode === "existing" ? "Derived from room base rate" : "Fixed nightly rate",
        basePlanId: manageMode === "existing" ? source?.id || null : null,
        adjustmentPct: signedAdjustment,
        price: basePrice,
        weekend: source?.weekend || Number(room.weekend || room.price) || basePrice,
        meal: mealMode === "yes" ? meal : "Room only",
        ...cancellationValues,
        minStay: effectiveMinStay,
        maxStay: Math.max(Number(source?.maxStay) || 30, effectiveMinStay),
        minAdvanceDays: effectiveMinAdvanceDays,
        valueAddIds,
      };
    });
  };

  const create = async () => {
    setSaving(true);
    try {
      await onCreate(buildPlans());
    } finally {
      setSaving(false);
    }
  };

  const fixedStayFirst = template.key === "weekly" || template.key === "monthly";
  const earlyFirst = template.key === "early-booker";
  const hasMinStayStep = Boolean(template.fixedMinStay || template.askMinStay);
  const hasBookingStep = Boolean(template.askBookingWindow);
  const hasAdjustmentStep = manageMode === "existing";
  const order = [
    ...(fixedStayFirst ? ["minStay"] : []),
    ...(earlyFirst ? ["booking"] : []),
    "cancellation",
    "meals",
    "valueAdds",
    ...(!fixedStayFirst && hasMinStayStep ? ["minStay"] : []),
    ...(!earlyFirst && hasBookingStep ? ["booking"] : []),
    "manage",
    ...(hasAdjustmentStep ? ["adjustment"] : []),
    "rooms",
    "name",
  ];
  const stepNumber = (key) => order.indexOf(key) + 1;

  const minStayTitle = "Would you like to set a minimum length of stay for this rate plan?";
  const minStayContent = template.fixedMinStay ? (
    <Callout tone="info">
      {template.fixedMinStay} night minimum stay
      {template.fixedMinStay === 7
        ? " — you can set weekly rates for stays of 7 nights and longer."
        : " — you can set monthly rates for stays of 28 nights and longer."}
    </Callout>
  ) : (
    <>
      <div className="grid gap-0.5">
        <RadioRow
          name="rate-min-stay"
          value="no"
          checked={!minStayEnabled}
          onChange={() => setMinStayEnabled(false)}
          label="No (this rate plan is available for any length of stay)"
        />
        <RadioRow
          name="rate-min-stay"
          value="yes"
          checked={minStayEnabled}
          onChange={() => setMinStayEnabled(true)}
          label="Yes"
        />
      </div>
      {minStayEnabled && (
        <div className="mt-2 max-w-[12rem]">
          <Field label="Minimum nights">
            <Input type="number" min="1" value={minStay} onChange={(event) => setMinStay(event.target.value)} />
          </Field>
        </div>
      )}
    </>
  );

  const bookingTitle = "How many days before check-in can guests book this rate plan?";
  const bookingContent =
    template.key === "early-booker" ? (
      <>
        <div className="max-w-[12rem]">
          <Field label="Days before check-in">
            <Input
              type="number"
              min="1"
              value={minAdvanceDays}
              onChange={(event) => setMinAdvanceDays(event.target.value)}
            />
          </Field>
          <p className="mt-1 text-xs text-muted">day(s) or more before check-in</p>
        </div>
        <Callout tone="success" title="Tip">
          Offer this rate to customers who book at least {minAdvanceDays || 0} days in advance. This can help fill rooms
          sooner so you don&apos;t need to drop prices at the last minute.
        </Callout>
      </>
    ) : (
      <>
        <div className="grid gap-0.5">
          <RadioRow
            name="rate-booking-window"
            value="anytime"
            checked={bookingWindow === "anytime"}
            onChange={() => setBookingWindow("anytime")}
            label="Any time (this rate plan is always available)"
          />
          <RadioRow
            name="rate-booking-window"
            value="min-days"
            checked={bookingWindow === "min-days"}
            onChange={() => setBookingWindow("min-days")}
            label="Set number of days before check-in"
          />
        </div>
        {bookingWindow === "min-days" && (
          <div className="mt-2 max-w-[12rem]">
            <Field label="Days before check-in">
              <Input
                type="number"
                min="1"
                value={minAdvanceDays}
                onChange={(event) => setMinAdvanceDays(event.target.value)}
              />
            </Field>
          </div>
        )}
      </>
    );

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6">
      {reviewing ? (
        <div>
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-slate-900">Review your {template.name.toLowerCase()} rate plan</h3>
            <p className="text-sm text-slate-500">
              {selectedRooms.length === 1
                ? "One rate plan will be created."
                : `${selectedRooms.length} rate plans will be created, one per room type.`}
            </p>
          </div>
          <dl className="rounded-xl border border-hairline bg-surface-soft/40 px-4">
            <SummaryRow label="Name" value={name.trim() || "—"} />
            <SummaryRow label="Cancellation policy" value={cancellationLabel(cancellation)} />
            <SummaryRow label="Meals" value={mealMode === "yes" ? meal : "Room only"} />
            <SummaryRow
              label="Value adds"
              value={
                valueAddIds.length
                  ? valueAdds
                      .filter((item) => valueAddIds.includes(item.id))
                      .map((item) => item.name)
                      .join(", ")
                  : "None"
              }
            />
            <SummaryRow label="Minimum stay" value={`${effectiveMinStay} ${effectiveMinStay === 1 ? "night" : "nights"}`} />
            <SummaryRow
              label="Booking window"
              value={
                effectiveMinAdvanceDays
                  ? `At least ${effectiveMinAdvanceDays} days before check-in`
                  : "Any time"
              }
            />
            <SummaryRow
              label="Pricing"
              value={
                manageMode === "new"
                  ? `New plan from ${formatMoney(
                      plans.find((plan) => plan.roomId === selectedRooms[0]?.id)?.price ||
                        selectedRooms[0]?.price ||
                        0,
                      property.currency || DEFAULT_CURRENCY,
                    )}`
                  : `${Math.abs(signedAdjustment)}% ${signedAdjustment >= 0 ? "more expensive" : "cheaper"} than ${
                      basePlan?.name || "the base rate"
                    }`
              }
            />
            <SummaryRow label="Room types" value={selectedRooms.map((room) => roomNames.get(room.id)).join(", ")} />
          </dl>
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setReviewing(false)} disabled={saving}>
              Back
            </Button>
            <Button variant="primary" onClick={create} loading={saving}>
              Create rate plan{selectedRooms.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-5 flex flex-col gap-1 border-b border-hairline pb-4">
            <h3 className="text-lg font-semibold text-slate-900">Add {template.name.toLowerCase()} rate plan</h3>
            <p className="text-sm text-slate-500">{template.tagline}</p>
          </div>

          {fixedStayFirst && (
            <WizardStep number={stepNumber("minStay")} last={false} title={minStayTitle}>
              {minStayContent}
            </WizardStep>
          )}
          {earlyFirst && (
            <WizardStep number={stepNumber("booking")} last={false} title={bookingTitle}>
              {bookingContent}
            </WizardStep>
          )}

          <WizardStep
            number={stepNumber("cancellation")}
            last={false}
            title="Which cancellation policy would you like to use for this rate plan?"
          >
            {template.fixedCancellationLabel ? (
              <div className="text-sm text-slate-600">{template.fixedCancellationLabel}</div>
            ) : template.key === "flexible" ? (
              <StaysSelect
                aria-label="Cancellation policy"
                options={template.cancellationChoices.map((value) => ({
                  value,
                  label: cancellationLabel(value),
                }))}
                value={cancellation}
                onChange={(event) => setCancellation(event.target.value as RatePlanCancellation)}
              />
            ) : (
              <div className="grid gap-0.5">
                {template.cancellationChoices.map((value) => (
                  <RadioRow
                    key={value}
                    name="rate-cancellation"
                    value={value}
                    checked={cancellation === value}
                    onChange={() => setCancellation(value)}
                    label={cancellationLabel(value)}
                  />
                ))}
              </div>
            )}
            {template.key === "flexible" && (
              <Callout tone="info" title="">
                Flexible rates are generally the most expensive rates on Booking.com. Guests are often willing to pay
                extra for the freedom to cancel free of charge and get a full refund.
              </Callout>
            )}
            {template.key === "firm" && (
              <Callout tone="info">
                A 14-day cancellation policy offers travellers the flexibility they&apos;re looking for while making sure
                your availability is optimised and you&apos;re most likely to secure more stays.
              </Callout>
            )}
          </WizardStep>

          <WizardStep
            number={stepNumber("meals")}
            last={false}
            title="Would you like to include meals in this rate plan?"
          >
            <div className="grid gap-0.5">
              <RadioRow
                name="rate-meal"
                value="no"
                checked={mealMode === "no"}
                onChange={() => setMealMode("no")}
                label="No"
              />
              <RadioRow
                name="rate-meal"
                value="yes"
                checked={mealMode === "yes"}
                onChange={() => setMealMode("yes")}
                label="Yes, add a meal plan"
              />
            </div>
            {mealMode === "yes" && (
              <div className="mt-2 max-w-sm">
                <Field label="Meal plan">
                  <StaysSelect
                    options={MEAL_PLANS.filter((value) => value !== "Room only")}
                    value={meal}
                    onChange={(event) => setMeal(event.target.value)}
                  />
                </Field>
              </div>
            )}
            <Callout tone="warning" title="Keep in mind">
              54% of bookings are made without meals. You can always offer meals to guests upon arrival.
            </Callout>
          </WizardStep>

          <WizardStep
            number={stepNumber("valueAdds")}
            last={false}
            title="Want to include value adds in this rate plan?"
            description="Each rate plan can have up to five value adds, such as parking, massage and credits."
          >
            {valueAdds.length > 0 && (
              <div className="grid gap-1 rounded-xl border border-hairline bg-surface-soft/40 p-2 sm:grid-cols-2">
                {valueAdds.map((item) => (
                  <Checkbox
                    key={item.id}
                    checked={valueAddIds.includes(item.id)}
                    onChange={() => toggleValueAdd(item.id)}
                    label={item.name}
                    description={`${formatMoney(item.price, property.currency || DEFAULT_CURRENCY)} ${
                      item.unit === "night" ? "per night" : item.unit === "guest" ? "per guest" : "per stay"
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setValueAddSheetOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline"
              >
                <Plus size={14} /> Attach new value adds
              </button>
              <span className="text-xs text-muted">{valueAddIds.length}/5 selected</span>
            </div>
          </WizardStep>

          {hasMinStayStep && !fixedStayFirst && (
            <WizardStep
              number={stepNumber("minStay")}
              last={false}
              title="Would you like to set a minimum length of stay for this rate plan?"
            >
              {template.fixedMinStay ? (
                <Callout tone="info">
                  {template.fixedMinStay} night minimum stay
                  {template.fixedMinStay === 7
                    ? " — you can set weekly rates for stays of 7 nights and longer."
                    : " — you can set monthly rates for stays of 28 nights and longer."}
                </Callout>
              ) : (
                <>
                  <div className="grid gap-0.5">
                    <RadioRow
                      name="rate-min-stay"
                      value="no"
                      checked={!minStayEnabled}
                      onChange={() => setMinStayEnabled(false)}
                      label="No (this rate plan is available for any length of stay)"
                    />
                    <RadioRow
                      name="rate-min-stay"
                      value="yes"
                      checked={minStayEnabled}
                      onChange={() => setMinStayEnabled(true)}
                      label="Yes"
                    />
                  </div>
                  {minStayEnabled && (
                    <div className="mt-2 max-w-[12rem]">
                      <Field label="Minimum nights">
                        <Input
                          type="number"
                          min="1"
                          value={minStay}
                          onChange={(event) => setMinStay(event.target.value)}
                        />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </WizardStep>
          )}

          {hasBookingStep && !earlyFirst && (
            <WizardStep
              number={stepNumber("booking")}
              last={false}
              title={
                template.key === "early-booker"
                  ? "How many days before check-in can guests book this rate plan?"
                  : "How many days before check-in can guests book this rate plan?"
              }
            >
              {template.key === "early-booker" ? (
                <>
                  <div className="max-w-[12rem]">
                    <Field label="Days before check-in">
                      <Input
                        type="number"
                        min="1"
                        value={minAdvanceDays}
                        onChange={(event) => setMinAdvanceDays(event.target.value)}
                      />
                    </Field>
                    <p className="mt-1 text-xs text-muted">day(s) or more before check-in</p>
                  </div>
                  <Callout tone="success" title="Tip">
                    Offer this rate to customers who book at least {minAdvanceDays || 0} days in advance. This can help
                    fill rooms sooner so you don&apos;t need to drop prices at the last minute.
                  </Callout>
                </>
              ) : (
                <>
                  <div className="grid gap-0.5">
                    <RadioRow
                      name="rate-booking-window"
                      value="anytime"
                      checked={bookingWindow === "anytime"}
                      onChange={() => setBookingWindow("anytime")}
                      label="Any time (this rate plan is always available)"
                    />
                    <RadioRow
                      name="rate-booking-window"
                      value="min-days"
                      checked={bookingWindow === "min-days"}
                      onChange={() => setBookingWindow("min-days")}
                      label="Set number of days before check-in"
                    />
                  </div>
                  {bookingWindow === "min-days" && (
                    <div className="mt-2 max-w-[12rem]">
                      <Field label="Days before check-in">
                        <Input
                          type="number"
                          min="1"
                          value={minAdvanceDays}
                          onChange={(event) => setMinAdvanceDays(event.target.value)}
                        />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </WizardStep>
          )}

          <WizardStep
            number={stepNumber("manage")}
            last={false}
            title="How would you like to manage this rate plan?"
          >
            <div className="grid gap-0.5">
              <RadioRow
                name="rate-manage"
                value="new"
                checked={manageMode === "new"}
                onChange={() => setManageMode("new")}
                label="Set up as a new rate plan"
              />
              <RadioRow
                name="rate-manage"
                value="existing"
                checked={manageMode === "existing"}
                onChange={() => setManageMode("existing")}
                label="Based on one of my current rate plans"
                description={plans.length ? undefined : "There are no existing rate plans yet."}
              />
            </div>
            {manageMode === "existing" && plans.length > 0 && (
              <>
                <div className="mt-2 max-w-md">
                  <StaysSelect
                    aria-label="Base rate plan"
                    options={plans.map((plan) => ({
                      value: plan.id,
                      label: `${plan.name} — ${roomNames.get(plan.roomId) || "Room"}`,
                    }))}
                    value={basePlanId}
                    onChange={(event) => setBasePlanId(event.target.value)}
                  />
                </div>
                <Callout tone="info">
                  This is the easiest and quickest way to manage your new rate plan. It will base its price and
                  availability on {basePlan?.name || "your base rate"} plus whatever price change you set in the next
                  step.
                </Callout>
              </>
            )}
            {manageMode === "new" && (
              <Callout tone="info">
                A new plan starts from the room&apos;s base price. You can adjust its nightly price on the Rate plans
                page after creating it.
              </Callout>
            )}
          </WizardStep>

          {hasAdjustmentStep && (
            <WizardStep
              number={stepNumber("adjustment")}
              last={false}
              title={
                template.adjustmentKind === "choice"
                  ? "Do you want this new plan to be cheaper or more expensive than the base rate?"
                  : template.adjustmentKind === "markup"
                    ? `How much more expensive than ${basePlan?.name || "the base rate"} would you like this plan to be?`
                    : "How would you like to set the price for this rate plan?"
              }
            >
              {template.adjustmentKind === "choice" && (
                <div className="mb-2 grid gap-0.5">
                  <RadioRow
                    name="rate-direction"
                    value="cheaper"
                    checked={direction === "cheaper"}
                    onChange={() => setDirection("cheaper")}
                    label="Cheaper than the base rate"
                  />
                  <RadioRow
                    name="rate-direction"
                    value="more"
                    checked={direction === "more"}
                    onChange={() => setDirection("more")}
                    label="More expensive than the base rate"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Price adjustment percentage"
                  type="number"
                  min="0"
                  value={adjustment}
                  onChange={(event) => setAdjustment(event.target.value)}
                  className="max-w-[7rem]"
                />
                <span className="text-sm font-semibold text-slate-600">%</span>
                <span className="text-sm text-slate-500">
                  {signedAdjustment >= 0 ? "more expensive than" : "cheaper than"} {basePlan?.name || "the base rate"}
                </span>
              </div>
              {template.adjustmentKind === "discount" && (
                <Callout tone="success" title="Tip">
                  Rate plans with a {Math.abs(signedAdjustment) || 0}% or more discount are competitive for this kind of
                  stay.
                </Callout>
              )}
            </WizardStep>
          )}

          <WizardStep
            number={stepNumber("rooms")}
            last={false}
            title="Which room types will be bookable with this rate plan?"
          >
            <div className="grid gap-1 rounded-xl border border-hairline bg-surface-soft/40 p-2 sm:grid-cols-2">
              {rooms.map((room) => (
                <Checkbox
                  key={room.id}
                  checked={roomIds.includes(room.id)}
                  onChange={() => toggleRoom(room.id)}
                  label={room.name || room.kind || "Room"}
                  description={`${room.count} ${room.count === 1 ? "unit" : "units"}`}
                />
              ))}
            </div>
          </WizardStep>

          <WizardStep
            number={stepNumber("name")}
            last
            title="What would you like to name this rate plan?"
          >
            <Input
              aria-label="Rate plan name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rate plan name"
            />
            <Callout tone="info">
              This name is just for you. We won&apos;t show it to customers on Booking.com.
            </Callout>
          </WizardStep>

          <div className="mt-2 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Back
            </Button>
            <Button variant="primary" onClick={review}>
              Review
            </Button>
          </div>
        </div>
      )}

      <ValueAddCreateSheet
        open={valueAddSheetOpen}
        onOpenChange={setValueAddSheetOpen}
        property={property}
        onCreated={(valueAdd) => {
          setCreatedValueAdds((current) => [...current, valueAdd]);
          setValueAddIds((current) => [...current, valueAdd.id].slice(0, 5));
        }}
      />
    </div>
  );
}
