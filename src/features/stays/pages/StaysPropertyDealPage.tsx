import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input } from "@/components/ui";
import StaysCard from "../components/StaysCard";
import PromotionStepper from "../components/promotions/PromotionStepper";
import SelectPropertiesStep from "../components/promotions/SelectPropertiesStep";
import PromotionReviewStep from "../components/promotions/PromotionReviewStep";

type Scope = "all" | "specific";
type StayRule = "rate-plan" | "minimum";
type SettingKey = "name" | "discount" | "bookings" | "ratePlans" | "rooms" | "stay";

type DealSettings = {
  name: string;
  discount: string;
  bookings: string;
  windowDays: string;
  ratePlanScope: Scope;
  roomScope: Scope;
  stayRule: StayRule;
  minimumNights: string;
};

const DEFAULT_SETTINGS: DealSettings = {
  name: "New Property Deal",
  discount: "20",
  bookings: "3",
  windowDays: "90",
  ratePlanScope: "all",
  roomScope: "all",
  stayRule: "rate-plan",
  minimumNights: "2",
};

const SETTING_TITLES: Record<SettingKey, string> = {
  name: "Deal name",
  discount: "Discount percentage",
  bookings: "Number of bookings",
  ratePlans: "Rate plans this discount applies to",
  rooms: "Rooms this discount applies to",
  stay: "How long guests need to stay",
};

function scopeLabel(scope: Scope, noun: "rate plans" | "rooms") {
  return scope === "all" ? `All ${noun}` : `Specific ${noun} (choose in Select properties)`;
}

function settingRows(settings: DealSettings) {
  const bookings = Math.max(1, Number(settings.bookings) || 1);
  const days = Math.max(1, Number(settings.windowDays) || 1);
  const discount = Math.max(1, Number(settings.discount) || 1);
  const nights = Math.max(1, Number(settings.minimumNights) || 1);
  return [
    { key: "name" as const, label: SETTING_TITLES.name, value: settings.name },
    { key: "discount" as const, label: SETTING_TITLES.discount, value: `${discount}%` },
    {
      key: "bookings" as const,
      label: SETTING_TITLES.bookings,
      value: `The first ${bookings} bookings during the first ${days} days will get a ${discount}% discount`,
    },
    {
      key: "ratePlans" as const,
      label: SETTING_TITLES.ratePlans,
      value: scopeLabel(settings.ratePlanScope, "rate plans"),
    },
    {
      key: "rooms" as const,
      label: SETTING_TITLES.rooms,
      value: scopeLabel(settings.roomScope, "rooms"),
    },
    {
      key: "stay" as const,
      label: SETTING_TITLES.stay,
      value: settings.stayRule === "rate-plan" ? "Stay must match rate plan" : `Minimum ${nights} nights`,
    },
  ];
}

function DealSettingDialog({
  setting,
  settings,
  onCancel,
  onSave,
}: {
  setting: SettingKey;
  settings: DealSettings;
  onCancel: () => void;
  onSave: (next: DealSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const update = (patch: Partial<DealSettings>) => setDraft((current) => ({ ...current, ...patch }));

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Name the deal");
      return;
    }
    const discount = Math.min(99, Math.max(1, Number(draft.discount) || 1));
    const bookings = Math.max(1, Number(draft.bookings) || 1);
    const windowDays = Math.max(1, Number(draft.windowDays) || 1);
    const minimumNights = Math.max(1, Number(draft.minimumNights) || 1);
    onSave({ ...draft, name: draft.name.trim(), discount: String(discount), bookings: String(bookings), windowDays: String(windowDays), minimumNights: String(minimumNights) });
  };

  return (
    <Dialog open onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent
        size="md"
        title={SETTING_TITLES[setting]}
        footer={
          <DialogFooter>
            <Button type="button" variant="primary" onClick={save}>
              Save changes
            </Button>
            <Button type="button" onClick={onCancel}>
              Cancel
            </Button>
          </DialogFooter>
        }
      >
        {setting === "name" && (
          <Field label="Deal name">
            <Input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
          </Field>
        )}
        {setting === "discount" && (
          <div className="max-w-[10rem]">
            <Field label="Discount percentage">
              <Input
                type="number"
                min="1"
                max="99"
                trailing="%"
                value={draft.discount}
                onChange={(event) => update({ discount: event.target.value })}
              />
            </Field>
          </div>
        )}
        {setting === "bookings" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Number of bookings">
              <Input
                type="number"
                min="1"
                value={draft.bookings}
                onChange={(event) => update({ bookings: event.target.value })}
              />
            </Field>
            <Field label="Within the first (days)">
              <Input
                type="number"
                min="1"
                value={draft.windowDays}
                onChange={(event) => update({ windowDays: event.target.value })}
              />
            </Field>
          </div>
        )}
        {setting === "ratePlans" && (
          <div className="grid gap-1" role="radiogroup" aria-label="Rate plan scope">
            {(["all", "specific"] as const).map((scope) => (
              <label
                key={scope}
                className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm text-body"
              >
                <input
                  type="radio"
                  name="rate-plan-scope"
                  checked={draft.ratePlanScope === scope}
                  onChange={() => update({ ratePlanScope: scope })}
                  className="size-4 accent-brand"
                />
                <span>
                  {scope === "all" ? "All rate plans" : "Specific rate plans"}
                  {scope === "specific" && (
                    <span className="mt-0.5 block text-xs text-muted">
                      You'll choose the plans after selecting properties.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
        {setting === "rooms" && (
          <div className="grid gap-1" role="radiogroup" aria-label="Room scope">
            {(["all", "specific"] as const).map((scope) => (
              <label
                key={scope}
                className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm text-body"
              >
                <input
                  type="radio"
                  name="room-scope"
                  checked={draft.roomScope === scope}
                  onChange={() => update({ roomScope: scope })}
                  className="size-4 accent-brand"
                />
                <span>
                  {scope === "all" ? "All rooms" : "Specific rooms"}
                  {scope === "specific" && (
                    <span className="mt-0.5 block text-xs text-muted">
                      You'll choose the rooms after selecting properties.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
        {setting === "stay" && (
          <div className="grid gap-1" role="radiogroup" aria-label="Length of stay rule">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm text-body">
              <input
                type="radio"
                name="stay-rule"
                checked={draft.stayRule === "rate-plan"}
                onChange={() => update({ stayRule: "rate-plan" })}
                className="size-4 accent-brand"
              />
              <span>Match to rate plan</span>
            </label>
            <label className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm text-body">
              <input
                type="radio"
                name="stay-rule"
                checked={draft.stayRule === "minimum"}
                onChange={() => update({ stayRule: "minimum" })}
                className="size-4 accent-brand"
              />
              <span>Select minimum length of stay</span>
            </label>
            {draft.stayRule === "minimum" && (
              <div className="mt-3 max-w-[10rem]">
                <Field label="Minimum nights">
                  <Input
                    type="number"
                    min="1"
                    value={draft.minimumNights}
                    onChange={(event) => update({ minimumNights: event.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The New Property Deal promotion flow: Settings → Select properties →
 * Check and confirm.
 */
export default function StaysPropertyDealPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [settings, setSettings] = useState<DealSettings>(DEFAULT_SETTINGS);
  const [editing, setEditing] = useState<SettingKey | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const rows = settingRows(settings);

  if (step === 3) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Create a New Property Deal
        </h1>
        <PromotionStepper current={3} firstLabel="Settings" />
        <div className="mt-5 sm:mt-6">
          <PromotionReviewStep
            title="Check and confirm"
            sections={[
              {
                title: "Deal settings",
                rows: rows.map(({ label, value }) => ({ label, value })),
                onEdit: () => setStep(1),
              },
            ]}
            selectedPropertyIds={selectedProperties}
            onEditProperties={() => setStep(2)}
            onBack={() => setStep(2)}
            onCreate={() => toast.info("Deal creation will be available when the backend endpoint is connected")}
            createLabel="Create deal"
          />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Create a New Property Deal
        </h1>
        <PromotionStepper current={2} firstLabel="Settings" />
        <div className="mt-5 sm:mt-6">
          <SelectPropertiesStep
            selected={selectedProperties}
            onSelectedChange={setSelectedProperties}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Create a New Property Deal</h1>

      <PromotionStepper current={1} firstLabel="Settings" />

      <StaysCard className="mt-5 rounded-md p-0 shadow-none sm:mt-6">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">Settings</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/80 sm:text-base">
            Stand out to guests with a {Math.max(1, Number(settings.discount) || 1)}% discount for the
            first {Math.max(1, Number(settings.bookings) || 1)} bookings or{" "}
            {Math.max(1, Number(settings.windowDays) || 1)} days, whichever comes first. After that
            the price will go back to the original price. You can also turn the deal off sooner.
          </p>
        </div>
        <dl>
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid gap-1 border-b border-hairline px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,18rem)_minmax(0,1fr)_auto] sm:items-start sm:gap-6 sm:px-6 sm:py-5"
            >
              <dt className="text-sm font-semibold text-ink">{row.label}:</dt>
              <dd className="text-sm leading-relaxed text-ink/80 sm:text-base">{row.value}</dd>
              <button
                type="button"
                onClick={() => setEditing(row.key)}
                aria-label={`Edit ${row.label}`}
                className="justify-self-start text-sm font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-self-end"
              >
                Edit
              </button>
            </div>
          ))}
        </dl>
      </StaysCard>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/stays/special-offers">Cancel</Link>
        </Button>
        <Button type="button" variant="primary" onClick={() => setStep(2)} className="w-full sm:w-auto">
          Select properties
        </Button>
      </div>

      {editing && (
        <DealSettingDialog
          key={editing}
          setting={editing}
          settings={settings}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setSettings(next);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
