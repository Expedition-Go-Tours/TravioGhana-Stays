import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, DialogContent, Field, Input, Money, NativeSelect, Textarea } from "@/components/ui";
import { getErrorMessage } from "@/lib/errorHandler";
import type { Booking } from "@/types/stays";
import { createStayBooking, listProperties, STAYS_KEYS } from "../../api";
import { nightsBetween, nightsLabel } from "../../utils/stayDates";
import {
  EMPTY_BOOKING_FORM,
  validateBookingForm,
  type CreateBookingErrors,
  type CreateBookingForm,
} from "./createBookingForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the saved booking. */
  onCreated: (booking: Booking) => void;
};

/** Record a walk-in or phone reservation against one of the supplier's rooms. */
export function CreateBookingDialog({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<CreateBookingForm>(EMPTY_BOOKING_FORM);
  const [errors, setErrors] = useState<CreateBookingErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // The page itself does not need the property catalogue; load it when the dialog opens.
  const propertiesQuery = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    enabled: open,
    staleTime: 30_000,
  });
  const properties = propertiesQuery.data ?? [];
  const property = properties.find((item) => item.id === form.propertyId);
  const room = property?.rooms.find((item) => item.id === form.roomId);
  const nights = form.checkIn && form.checkOut > form.checkIn ? nightsBetween(form.checkIn, form.checkOut) : null;
  const estimate = room && nights ? Number(room.price || 0) * nights : null;

  const update = (patch: Partial<CreateBookingForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    // Clear the message for a field as soon as it is edited.
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof CreateBookingForm)[]) delete next[key];
      return next;
    });
  };

  const reset = () => {
    setForm(EMPTY_BOOKING_FORM);
    setErrors({});
    setSubmitError("");
  };

  const close = (next: boolean) => {
    if (saving) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    const found = validateBookingForm(form, properties);
    setErrors(found);
    if (Object.keys(found).length) {
      // Take keyboard and screen-reader users to the first problem.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setSaving(true);
    try {
      const booking = await createStayBooking({
        propertyId: form.propertyId,
        roomId: form.roomId,
        guestName: form.guestName.trim(),
        guestEmail: form.guestEmail.trim() || undefined,
        guestPhone: form.guestPhone.trim() || undefined,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
        specialRequests: form.specialRequests.trim() || undefined,
      });
      reset();
      onCreated(booking);
    } catch (error) {
      setSubmitError(getErrorMessage(error) || "We couldn't create the booking. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        size="md"
        title="Create booking"
        description="Record a walk-in or phone reservation against one of your rooms."
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="create-booking" loading={saving}>
              Create booking
            </Button>
          </>
        }
      >
        <form ref={formRef} id="create-booking" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Property" required error={errors.propertyId} wide>
            <NativeSelect
              value={form.propertyId}
              disabled={propertiesQuery.isLoading || !properties.length}
              onChange={(event) => update({ propertyId: event.target.value, roomId: "" })}
            >
              <option value="">
                {propertiesQuery.isLoading ? "Loading properties…" : properties.length ? "Select a property" : "No properties yet"}
              </option>
              {properties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Room" required error={errors.roomId} wide>
            <NativeSelect value={form.roomId} disabled={!property} onChange={(event) => update({ roomId: event.target.value })}>
              <option value="">{property ? "Select a room" : "Select a property first"}</option>
              {(property?.rooms ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.kind || "Room"}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Guest name" required error={errors.guestName} wide>
            <Input
              value={form.guestName}
              autoComplete="off"
              placeholder="Full name"
              onChange={(event) => update({ guestName: event.target.value })}
            />
          </Field>

          <Field label="Email" error={errors.guestEmail}>
            <Input
              type="email"
              inputMode="email"
              value={form.guestEmail}
              placeholder="guest@example.com"
              onChange={(event) => update({ guestEmail: event.target.value })}
            />
          </Field>

          <Field label="Phone">
            <Input
              type="tel"
              inputMode="tel"
              value={form.guestPhone}
              placeholder="+233 20 000 0000"
              onChange={(event) => update({ guestPhone: event.target.value })}
            />
          </Field>

          <Field label="Check-in" required error={errors.checkIn}>
            <Input type="date" value={form.checkIn} onChange={(event) => update({ checkIn: event.target.value })} />
          </Field>

          <Field label="Check-out" required error={errors.checkOut}>
            <Input
              type="date"
              value={form.checkOut}
              min={form.checkIn || undefined}
              onChange={(event) => update({ checkOut: event.target.value })}
            />
          </Field>

          <Field label="Guests" required error={errors.guests}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.guests}
              onChange={(event) => update({ guests: event.target.value })}
            />
          </Field>

          <div className="flex flex-col justify-end">
            {estimate !== null && (
              <div className="rounded-control bg-surface-soft px-3.5 py-2.5" aria-live="polite">
                <p className="text-caption text-muted">
                  Estimated total · {nightsLabel(nights)}
                </p>
                <Money amount={estimate} currency={property?.currency} className="text-base font-bold text-ink" />
              </div>
            )}
          </div>

          <Field label="Special requests" wide>
            <Textarea
              rows={3}
              value={form.specialRequests}
              placeholder="Airport pickup, late arrival, dietary notes…"
              onChange={(event) => update({ specialRequests: event.target.value })}
            />
          </Field>

          {submitError && (
            <p role="alert" className="col-span-full rounded-control bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
              {submitError}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
