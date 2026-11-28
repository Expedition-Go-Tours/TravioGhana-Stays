import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button, Input } from "@/components/ui";
import { Calendar } from "@/components/ui/calendar";
import DatePicker from "@/components/forms/DatePicker";
import DateRangePicker from "@/components/forms/DateRangePicker";
import StaysCard from "../components/StaysCard";
import PromotionStepper from "../components/promotions/PromotionStepper";
import SelectPropertiesStep from "../components/promotions/SelectPropertiesStep";
import PromotionReviewStep, {
  type PromotionReviewSection,
} from "../components/promotions/PromotionReviewStep";
import LengthOfStayDialog, {
  type LengthOfStayValue,
} from "../components/promotions/LengthOfStayDialog";
import { fromISODate, shiftISOMonths, toISODate, todayISO } from "../utils/dates";
import { Info } from "@/features/stays/icons";
import type { PromotionDealConfig, PromotionDealKind } from "../config/promotionDeals";
import { PROMOTION_DEALS } from "../config/promotionDeals";

const WEEKDAYS = [
  { value: 1, short: "Mo", label: "Monday" },
  { value: 2, short: "Tu", label: "Tuesday" },
  { value: 3, short: "We", label: "Wednesday" },
  { value: 4, short: "Th", label: "Thursday" },
  { value: 5, short: "Fr", label: "Friday" },
  { value: 6, short: "Sa", label: "Saturday" },
  { value: 0, short: "Su", label: "Sunday" },
];

const LATE_MONTHS = [
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
  { value: "2027-01", label: "January 2027" },
];

function formatDateRange(from: string, to: string) {
  if (!from || !to) return "Select dates";
  return `${format(fromISODate(from), "d MMM yyyy")}–${format(fromISODate(to), "d MMM yyyy")}`;
}

function CardHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-bold text-ink">{children}</h2>;
}

function InfoBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-hairline bg-surface px-4 py-3 text-sm leading-relaxed text-ink/80">
      <Info size={17} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  );
}

function Choice({
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
      <span className="min-w-0">{children}</span>
    </label>
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
    <label className="flex min-h-9 cursor-pointer items-center gap-2 py-1.5 text-sm text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-[18px] shrink-0 cursor-pointer rounded-[4px] accent-brand"
      />
      <span>{children}</span>
    </label>
  );
}

function AudienceCard({
  audience,
  onChange,
}: {
  audience: "everyone" | "members";
  onChange: (value: "everyone" | "members") => void;
}) {
  return (
    <StaysCard className="rounded-md shadow-none">
      <CardHeading>Audience</CardHeading>
      <p className="mt-2 text-sm text-ink/80 sm:text-base">Who will be able to see this promotion?</p>
      <div className="mt-2 grid gap-0.5" role="radiogroup" aria-label="Audience">
        <Choice name="audience" value="everyone" checked={audience === "everyone"} onChange={() => onChange("everyone")}>
          Everyone
        </Choice>
        <Choice name="audience" value="members" checked={audience === "members"} onChange={() => onChange("members")}>
          Members and newsletter subscribers only – <strong className="font-semibold">Secret deal</strong>{" "}
          <span title="Only signed-in members and newsletter subscribers can see this deal.">
            <Info size={15} className="inline text-muted" aria-hidden="true" />
          </span>
        </Choice>
      </div>
    </StaysCard>
  );
}

function DiscountCard({
  config,
  value,
  onChange,
}: {
  config: PromotionDealConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const clamp = () => {
    const numeric = Math.max(config.discountMin, Math.min(99, Number(value) || config.discountMin));
    onChange(String(numeric));
  };

  return (
    <StaysCard className="rounded-md shadow-none">
      <CardHeading>
        {config.kind === "basic-deal"
          ? "How much of a discount would you like to offer?"
          : "How much of a discount do you want to give?"}
      </CardHeading>
      <p className="mt-2 text-sm text-ink/80 sm:text-base">
        Please set a discount between {config.discountMin}% and 99%
      </p>
      <div className="mt-4 max-w-[10rem]">
        <Input
          type="number"
          min={config.discountMin}
          max="99"
          aria-label="Discount percentage"
          value={value}
          trailing="%"
          onChange={(event) => onChange(event.target.value)}
          onBlur={clamp}
        />
      </div>
    </StaysCard>
  );
}

function BookWindowCard({
  config,
  days,
  onDaysChange,
  mode,
  onModeChange,
  hours,
  onHoursChange,
}: {
  config: PromotionDealConfig;
  days: string;
  onDaysChange: (value: string) => void;
  mode: "days" | "hours";
  onModeChange: (value: "days" | "hours") => void;
  hours: string;
  onHoursChange: (value: string) => void;
}) {
  if (config.bookWindow === "none") return null;

  return (
    <StaysCard className="rounded-md shadow-none">
      <CardHeading>Book window</CardHeading>
      <p className="mt-2 text-sm text-ink/80 sm:text-base">
        How long before check-in can this promotion be booked?
      </p>
      {config.bookWindow === "minimum-days" ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            min="1"
            aria-label="Minimum days before check-in"
            value={days}
            onChange={(event) => onDaysChange(event.target.value)}
            className="w-20"
          />
          <span className="text-sm text-body">days minimum before check-in</span>
        </div>
      ) : (
        <div className="mt-2 grid gap-1" role="radiogroup" aria-label="Book window">
          <div className="flex min-h-10 items-center gap-3">
            <input
              type="radio"
              name="last-minute-window"
              checked={mode === "days"}
              onChange={() => onModeChange("days")}
              aria-label="Days before check-in"
              className="size-4 shrink-0 accent-brand"
            />
            <Input
              type="number"
              min="1"
              aria-label="Days maximum before check-in"
              value={days}
              disabled={mode !== "days"}
              onChange={(event) => onDaysChange(event.target.value)}
              className="w-20 disabled:bg-surface-soft"
            />
            <span className="text-sm text-body">days maximum before check-in</span>
          </div>
          <div className="flex min-h-10 items-center gap-3">
            <input
              type="radio"
              name="last-minute-window"
              checked={mode === "hours"}
              onChange={() => onModeChange("hours")}
              aria-label="Hours before check-in"
              className="size-4 shrink-0 accent-brand"
            />
            <Input
              type="number"
              min="1"
              aria-label="Hours maximum before check-in"
              value={hours}
              disabled={mode !== "hours"}
              onChange={(event) => onHoursChange(event.target.value)}
              className="w-20 disabled:bg-surface-soft"
            />
            <span className="text-sm text-body">hours maximum before check-in</span>
          </div>
        </div>
      )}
    </StaysCard>
  );
}

function NameCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <StaysCard className="rounded-md shadow-none">
      <CardHeading>{title}</CardHeading>
      <p className="mt-2 text-sm text-ink/80 sm:text-base">
        This name is just for you. We won&apos;t show it to customers on Booking.com.
      </p>
      <div className="mt-4">
        <Input aria-label="Promotion name" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </StaysCard>
  );
}

function LengthOfStayCard({
  value,
  nights,
  onEdit,
}: {
  value: LengthOfStayValue;
  nights: string;
  onEdit: () => void;
}) {
  return (
    <StaysCard className="rounded-md shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardHeading>Length of stay</CardHeading>
          <p className="mt-1 text-sm text-ink/80 sm:text-base">
            {value === "rate-plans" ? "Match to rate plans" : `Minimum ${Math.max(1, Number(nights) || 1)} nights`}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Edit
        </button>
      </div>
    </StaysCard>
  );
}

export default function StaysPromotionSettingsPage({ kind }: { kind: PromotionDealKind }) {
  const config = PROMOTION_DEALS[kind];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const today = todayISO();
  const [audience, setAudience] = useState<"everyone" | "members">("everyone");
  const [discount, setDiscount] = useState(String(config.discountDefault));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => shiftISOMonths(today, 3));
  const [specificRange, setSpecificRange] = useState<DateRange | undefined>(() => ({
    from: fromISODate(today),
    to: fromISODate(shiftISOMonths(today, 3)),
  }));
  const [stayMode, setStayMode] = useState<"range" | "specific">("range");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [name, setName] = useState(config.defaultName);
  const [bookDays, setBookDays] = useState(
    config.bookWindow === "maximum-days-hours" ? "3" : "30",
  );
  const [bookMode, setBookMode] = useState<"days" | "hours">("days");
  const [bookHours, setBookHours] = useState("8");
  const [lengthValue, setLengthValue] = useState<LengthOfStayValue>("rate-plans");
  const [minimumNights, setMinimumNights] = useState("2");
  const [lengthOpen, setLengthOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [lateRange, setLateRange] = useState<DateRange | undefined>(() => ({
    from: fromISODate(config.lateEscape?.calendarFrom ?? today),
    to: fromISODate(config.lateEscape?.calendarTo ?? shiftISOMonths(today, 3)),
  }));
  const [availableMonths, setAvailableMonths] = useState<string[]>(LATE_MONTHS.map((month) => month.value));
  const editTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (step !== 1) return;
    const target = editTargetRef.current;
    if (!target) return;
    editTargetRef.current = null;
    requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  }, [step]);

  const toggleWeekday = (day: number) =>
    setWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );

  const updateStart = (value: string) => {
    setStartDate(value);
    setSpecificRange((current) => ({ ...current, from: value ? fromISODate(value) : undefined }));
  };
  const updateEnd = (value: string) => {
    setEndDate(value);
    setSpecificRange((current) => ({ ...current, to: value ? fromISODate(value) : undefined }));
  };

  const applySpecificRange = (range: DateRange | undefined) => {
    setSpecificRange(range);
    if (range?.from) setStartDate(toISODate(range.from));
    if (range?.to) setEndDate(toISODate(range.to));
  };

  const dateSummary = useMemo(() => formatDateRange(startDate, endDate), [startDate, endDate]);
  const lateSummary = config.lateEscape
    ? formatDateRange(config.lateEscape.stayFrom, config.lateEscape.stayTo)
    : "";

  const toggleMonth = (value: string) =>
    setAvailableMonths((current) =>
      current.includes(value) ? current.filter((month) => month !== value) : [...current, value],
    );

  const goToSettings = (sectionId: string) => {
    editTargetRef.current = sectionId;
    setStep(1);
  };

  const weekdaySummary = WEEKDAYS.filter((day) => weekdays.includes(day.value))
    .map((day) => day.short)
    .join(", ");
  const audienceSummary =
    audience === "everyone" ? "Everyone" : "Members and newsletter subscribers only (Secret deal)";
  const bookWindowSummary =
    config.bookWindow === "minimum-days"
      ? `${bookDays} days minimum before check-in`
      : config.bookWindow === "maximum-days-hours"
        ? bookMode === "days"
          ? `${bookDays} days maximum before check-in`
          : `${bookHours} hours maximum before check-in`
        : null;
  const lengthOfStaySummary =
    lengthValue === "rate-plans" ? "Match to rate plans" : `Minimum ${Math.max(1, Number(minimumNights) || 1)} nights`;
  const monthSummary =
    LATE_MONTHS.filter((month) => availableMonths.includes(month.value))
      .map((month) => month.label)
      .join(", ") || "None";

  const reviewSections: PromotionReviewSection[] = config.lateEscape
    ? [
        {
          title: "Book dates",
          rows: [{ label: "Book dates", value: config.lateEscape.bookDates }],
        },
        {
          title: "Discount",
          rows: [{ label: "Discount", value: `${discount}%` }],
          onEdit: () => goToSettings("late-discount"),
        },
        {
          title: "Stay dates",
          rows: [
            { label: "Dates", value: lateSummary },
            { label: "Days of week", value: weekdaySummary },
            { label: "Available only during", value: monthSummary },
          ],
          onEdit: () => goToSettings("late-stay-dates"),
        },
        {
          title: "Promotion name",
          rows: [{ label: "Name", value: name }],
          onEdit: () => goToSettings("promotion-name"),
        },
      ]
    : [
        ...(bookWindowSummary
          ? [
              {
                title: "Book window",
                rows: [{ label: "Booking window", value: bookWindowSummary }],
                onEdit: () => goToSettings("book-window"),
              },
            ]
          : []),
        {
          title: "Audience",
          rows: [{ label: "Visible to", value: audienceSummary }],
          onEdit: () => goToSettings("audience"),
        },
        {
          title: "Discount",
          rows: [{ label: "Discount", value: `${discount}%` }],
          onEdit: () => goToSettings("discount"),
        },
        {
          title: "Stay dates",
          rows: [
            { label: "Dates", value: dateSummary },
            { label: "Days of week", value: weekdaySummary },
          ],
          onEdit: () => goToSettings("stay-dates"),
        },
        {
          title: "Promotion name",
          rows: [{ label: "Name", value: name }],
          onEdit: () => goToSettings("promotion-name"),
        },
        ...(config.lengthOfStay
          ? [
              {
                title: "Length of stay",
                rows: [{ label: "Minimum stay", value: lengthOfStaySummary }],
                onEdit: () => goToSettings("length-of-stay"),
              },
            ]
          : []),
      ];

  const stayDatesCard = (
    <StaysCard className="rounded-md shadow-none">
      <CardHeading>Stay dates</CardHeading>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { value: "range", label: "Select a date range" },
          { value: "specific", label: "Select specific dates" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStayMode(option.value as "range" | "specific")}
            aria-pressed={stayMode === option.value}
            className={`h-10 border px-4 text-sm font-semibold transition-colors ${
              stayMode === option.value
                ? "border-brand bg-brand text-on-brand"
                : "border-hairline-strong bg-surface text-ink hover:border-slate-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {stayMode === "range" ? (
        <div className="mt-4 grid gap-3 sm:max-w-xl sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm text-body">Starts on:</p>
            <DatePicker value={startDate} onChange={updateStart} aria-label="Starts on" />
          </div>
          <div>
            <p className="mb-1.5 text-sm text-body">Ends on:</p>
            <DatePicker
              value={endDate}
              minDate={startDate || undefined}
              onChange={updateEnd}
              aria-label="Ends on"
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 max-w-xl">
          <DateRangePicker
            value={specificRange}
            onChange={applySpecificRange}
            label="Stay dates"
            placeholder="Select stay dates"
          />
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-ink">
          Which day(s) of the week would you like to include in this promotion?
        </h3>
        <p className="mt-1 text-sm text-muted">Uncheck a day of the week to remove it from this promotion&apos;s calendar</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
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
      </div>

      <div className="mt-4">
        <InfoBox title="Your discount will apply to stays between the following dates:">
          <p>{dateSummary}</p>
        </InfoBox>
      </div>
    </StaysCard>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button asChild variant="secondary" className="w-full sm:w-auto">
        <Link to="/stays/special-offers">Cancel</Link>
      </Button>
      <Button type="button" variant="primary" onClick={() => setStep(2)} className="w-full sm:w-auto">
        Select properties
      </Button>
    </div>
  );

  if (step === 3) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Add a new promotion</h1>
        <PromotionStepper current={3} />
        <div className="mt-5 sm:mt-6">
          <PromotionReviewStep
            sections={reviewSections}
            selectedPropertyIds={selectedProperties}
            onEditProperties={() => setStep(2)}
            onBack={() => setStep(2)}
            onCreate={() => toast.info("Promotion creation will be available when the backend endpoint is connected")}
          />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Add a new promotion</h1>
        <PromotionStepper current={2} />
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
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Add a new promotion</h1>
      <PromotionStepper current={step} />

      {config.lateEscape && (
        <div className="mt-5">
          <h2 className="text-xl font-bold text-ink">{config.title}</h2>
          <p className="mt-1 text-sm text-ink/80 sm:text-base">{config.lateEscape.description}</p>
        </div>
      )}

      <div className="mt-5 space-y-4 sm:mt-6">
        {config.lateEscape ? (
          <>
            <StaysCard className="rounded-md shadow-none">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <CardHeading>Book dates</CardHeading>
                <p className="text-sm text-ink/80 sm:text-base">{config.lateEscape.bookDates}</p>
              </div>
            </StaysCard>
            <div id="late-discount" className="scroll-mt-24">
              <DiscountCard config={config} value={discount} onChange={setDiscount} />
            </div>
            <div id="late-stay-dates" className="scroll-mt-24">
              <StaysCard className="rounded-md shadow-none">
              <CardHeading>Stay dates</CardHeading>
              <div className="mt-3">
                <InfoBox>
                  To select/unselect specific dates, hold <strong>CTRL / CMD</strong> and click on each date.
                </InfoBox>
              </div>
              <div className="mt-4 flex justify-center rounded-md border border-hairline p-3">
                <Calendar
                  mode="range"
                  selected={lateRange}
                  onSelect={(range) => setLateRange(range)}
                  numberOfMonths={2}
                  weekStartsOn={1}
                  defaultMonth={config.lateEscape.defaultMonth}
                />
              </div>
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink">
                  Which day(s) of the week would you like to include in this promotion?
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Uncheck a day of the week to remove it from this promotion&apos;s calendar
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
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
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-ink">Discounted rate available only during:</p>
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                  {LATE_MONTHS.map((month) => (
                    <CompactCheckbox
                      key={month.value}
                      checked={availableMonths.includes(month.value)}
                      onChange={() => toggleMonth(month.value)}
                    >
                      {month.label}
                    </CompactCheckbox>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <InfoBox title="Your discount will apply to stays between the following dates:">
                  <p>{lateSummary}</p>
                </InfoBox>
              </div>
            </StaysCard>
            </div>
            <div id="promotion-name" className="scroll-mt-24">
              <NameCard
                title="What do you want to name this promotion?"
                value={name}
                onChange={setName}
              />
            </div>
          </>
        ) : (
          <>
            <div id="book-window" className="scroll-mt-24">
              <BookWindowCard
                config={config}
                days={bookDays}
                onDaysChange={setBookDays}
                mode={bookMode}
                onModeChange={setBookMode}
                hours={bookHours}
                onHoursChange={setBookHours}
              />
            </div>
            <div id="audience" className="scroll-mt-24">
              <AudienceCard audience={audience} onChange={setAudience} />
            </div>
            <div id="discount" className="scroll-mt-24">
              <DiscountCard config={config} value={discount} onChange={setDiscount} />
            </div>
            <div id="stay-dates" className="scroll-mt-24">
              {stayDatesCard}
            </div>
            <div id="promotion-name" className="scroll-mt-24">
              <NameCard title="Promotion name" value={name} onChange={setName} />
            </div>
            {config.lengthOfStay && (
              <div id="length-of-stay" className="scroll-mt-24">
                <LengthOfStayCard value={lengthValue} nights={minimumNights} onEdit={() => setLengthOpen(true)} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-5">{footer}</div>

      {lengthOpen && (
        <LengthOfStayDialog
          initialValue={lengthValue}
          initialNights={minimumNights}
          onCancel={() => setLengthOpen(false)}
          onSave={(value, nights) => {
            setLengthValue(value);
            setMinimumNights(nights);
            setLengthOpen(false);
          }}
        />
      )}
    </div>
  );
}
