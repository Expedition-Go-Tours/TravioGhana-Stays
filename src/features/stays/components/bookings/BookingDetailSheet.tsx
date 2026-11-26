import { useState, type ReactNode } from "react";
import { Badge, Button, ConfirmDialog, EmptyState, Money, Sheet, SheetContent, StatusBadge } from "@/components/ui";
import Skeleton from "@/components/shared/Skeleton";
import { EnvelopeSimple, Phone, Ticket } from "@/features/stays/icons";
import type { BookingListItem, CurrencyCode } from "@/types/stays";
import { formatStayDate, formatStayRange, nightsBetween, nightsLabel } from "../../utils/stayDates";
import { actionsFor, type BookingAction } from "./bookingList";

type Props = {
  /** The id from `?bookingId=`; the sheet is open while it is set. */
  bookingId: string | null;
  /** The matching booking, or undefined while loading / when it does not exist. */
  booking: BookingListItem | undefined;
  loading: boolean;
  currency?: CurrencyCode;
  onClose: () => void;
  /** Runs a status change; resolves when it has been saved (rejects on failure). */
  onAction: (booking: BookingListItem, action: BookingAction) => Promise<unknown>;
  /** The status the booking is being moved to, while a change is saving. */
  pendingStatus: string | null;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-hairline py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-overline font-semibold uppercase text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * One reservation, opened from a row (or a `?bookingId=` link from the
 * dashboard or a notification): stay, property, guest contact, payment, and
 * the status changes this booking allows. Cancelling asks first.
 */
export function BookingDetailSheet({ bookingId, booking, loading, currency, onClose, onAction, pendingStatus }: Props) {
  const [confirming, setConfirming] = useState<BookingAction | null>(null);
  const actions = booking ? actionsFor(booking.status) : [];
  const forward = actions.filter((action) => !action.destructive);
  const destructive = actions.filter((action) => action.destructive);
  const busy = pendingStatus !== null;

  const run = (action: BookingAction) => {
    if (!booking) return;
    if (action.destructive) {
      setConfirming(action);
      return;
    }
    void onAction(booking, action).catch(() => undefined);
  };

  const confirm = () => {
    if (!booking || !confirming) return;
    onAction(booking, confirming)
      .then(() => setConfirming(null))
      .catch(() => undefined);
  };

  const nights = booking ? nightsLabel(nightsBetween(booking.from, booking.to)) : null;
  const guests = booking ? Number(booking.guests) || 1 : 0;
  const stopped = booking?.status === "Cancelled" || booking?.status === "No-show";

  return (
    <>
      <Sheet open={Boolean(bookingId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          title={booking ? booking.guest : "Reservation"}
          description={booking ? `Reservation ${booking.id}` : bookingId ? `Reservation ${bookingId}` : undefined}
          footer={
            actions.length > 0 ? (
              <div className="flex w-full flex-wrap-reverse items-center justify-between gap-2">
                <div className="flex gap-2">
                  {destructive.map((action) => (
                    <Button key={action.to} variant="dangerSoft" disabled={busy} onClick={() => run(action)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 max-sm:flex-1 [&>*]:max-sm:flex-1">
                  {forward.map((action) => (
                    <Button
                      key={action.to}
                      variant="primary"
                      disabled={busy}
                      loading={pendingStatus === action.to}
                      onClick={() => run(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : undefined
          }
        >
          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading reservation">
              <Skeleton height={56} className="rounded-xl" />
              <Skeleton height={120} className="rounded-xl" />
              <Skeleton height={120} className="rounded-xl" />
            </div>
          ) : !booking ? (
            <EmptyState
              compact
              icon={<Ticket size={22} />}
              title="We couldn't find this reservation"
              description="It may have been removed, or the link is out of date."
              action={<Button onClick={onClose}>Back to reservations</Button>}
            />
          ) : (
            <div>
              <div className="mb-5 flex items-center justify-between gap-3 rounded-card bg-surface-soft p-4">
                <div className="min-w-0">
                  <p className="font-display text-h3 font-bold text-ink">{formatStayRange(booking.from, booking.to)}</p>
                  <p className="text-sm text-muted">
                    {[nights, guests === 1 ? "1 guest" : `${guests} guests`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <StatusBadge domain="booking" status={booking.status} size="md" />
              </div>

              <Section title="Stay">
                <dl>
                  <Row label="Check-in">{formatStayDate(booking.from)}</Row>
                  <Row label="Check-out">{formatStayDate(booking.to)}</Row>
                  {nights && <Row label="Length">{nights}</Row>}
                  <Row label="Guests">{guests === 1 ? "1 guest" : `${guests} guests`}</Row>
                </dl>
              </Section>

              <Section title="Property">
                <dl>
                  <Row label="Property">{booking.propertyName || "—"}</Row>
                  <Row label="Room">{booking.room || "—"}</Row>
                </dl>
              </Section>

              {(booking.guestEmail || booking.guestPhone) && (
                <Section title="Guest contact">
                  <div className="flex flex-col gap-2">
                    {booking.guestEmail && (
                      <a
                        href={`mailto:${booking.guestEmail}`}
                        className="flex min-h-11 items-center gap-3 rounded-control px-1 text-sm text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <EnvelopeSimple size={18} aria-hidden="true" />
                        <span className="truncate">{booking.guestEmail}</span>
                      </a>
                    )}
                    {booking.guestPhone && (
                      <a
                        href={`tel:${booking.guestPhone.replace(/[^\d+]/g, "")}`}
                        className="flex min-h-11 items-center gap-3 rounded-control px-1 text-sm text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Phone size={18} aria-hidden="true" />
                        <span>{booking.guestPhone}</span>
                      </a>
                    )}
                  </div>
                </Section>
              )}

              <Section title="Payment">
                <dl>
                  <Row label="Reservation total">
                    <Money amount={booking.amount} currency={booking.currency ?? currency} className="text-base font-bold" />
                  </Row>
                  {booking.refundAmount != null && (
                    <Row label="Refunded">
                      <Money amount={booking.refundAmount} currency={booking.currency ?? currency} />
                    </Row>
                  )}
                </dl>
                <p className="mt-2 text-caption text-muted">
                  {stopped ? "This stay will not be paid out." : "Collected by Travio Ghana and paid out after the stay."}
                </p>
              </Section>

              {(booking.note || (stopped && booking.reason)) && (
                <Section title="Notes">
                  {booking.note && <p className="text-sm leading-relaxed text-body">{booking.note}</p>}
                  {stopped && booking.reason && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-body">
                      <Badge tone="danger">Reason</Badge>
                      {booking.reason}
                    </p>
                  )}
                </Section>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Cancel this reservation?"
        description={
          booking
            ? `${booking.guest}'s stay on ${formatStayDate(booking.from)} will be cancelled. This can't be undone.`
            : undefined
        }
        confirmLabel="Cancel reservation"
        cancelLabel="Keep reservation"
        loading={pendingStatus === confirming?.to}
        onConfirm={confirm}
      />
    </>
  );
}
