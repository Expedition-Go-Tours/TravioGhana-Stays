import type { PropertyListItem } from "@/types/stays";

/** The create-booking form, as typed (every field a string). */
export type CreateBookingForm = {
  propertyId: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  specialRequests: string;
};

export type CreateBookingErrors = Partial<Record<keyof CreateBookingForm, string>>;

export const EMPTY_BOOKING_FORM: CreateBookingForm = {
  propertyId: "",
  roomId: "",
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  checkIn: "",
  checkOut: "",
  guests: "1",
  specialRequests: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field-level checks; the API repeats them, this only saves a round trip. */
export function validateBookingForm(form: CreateBookingForm, properties: PropertyListItem[]): CreateBookingErrors {
  const errors: CreateBookingErrors = {};
  const property = properties.find((item) => item.id === form.propertyId);
  const room = property?.rooms.find((item) => item.id === form.roomId);

  if (!property) errors.propertyId = "Choose a property.";
  else if (!room) errors.roomId = "Choose a room.";
  if (!form.guestName.trim()) errors.guestName = "Add the guest's name.";
  if (form.guestEmail.trim() && !EMAIL.test(form.guestEmail.trim())) errors.guestEmail = "Enter a valid email address.";
  if (!form.checkIn) errors.checkIn = "Choose the check-in date.";
  if (!form.checkOut) errors.checkOut = "Choose the check-out date.";
  else if (form.checkIn && form.checkOut <= form.checkIn) errors.checkOut = "Check-out must be after check-in.";

  const guests = Number(form.guests);
  const capacity = room ? (Number(room.adults) || 0) + (Number(room.children) || 0) : 0;
  if (!Number.isInteger(guests) || guests < 1) errors.guests = "At least 1 guest.";
  else if (capacity > 0 && guests > capacity) errors.guests = `This room sleeps up to ${capacity}.`;

  return errors;
}
