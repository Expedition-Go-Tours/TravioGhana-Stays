/**
 * Stays workspace API.
 *
 * Every function resolves to already-unwrapped data (the convention used by
 * `features/finance/api.js` and friends) and reads either from:
 *
 *   - the in-feature mock dataset (`features/stays/mock`), or
 *   - the live supplier API,
 *
 * decided by `config.stays.dataSource` (`VITE_STAYS_DATA_SOURCE`). The live
 * endpoint paths and response shapes below ARE the backend contract; the mock
 * mirrors them function-for-function, so flipping the switch is a config
 * change, never a page change.
 *
 * The live calls intentionally use `skipGlobalErrorHandler` — pages surface
 * their own error states with retry, the same pattern as the products list.
 *
 * Return types come from `types/stays.ts`. The live responses are not
 * validated at runtime here; the dev API status page checks them against
 * `types/guards.ts`.
 */
import api from "@/lib/axios";
import { config } from "@/config";
import { staysMock } from "./mock/store";
import { isoDaysBetween, shiftISODays, weekdayOf } from "./utils/dates";
import { applyCopyAdjustment, copyDatePairs, type CopyRateAdjustment } from "./utils/copyRates";
import type {
  AnalyticsSummary,
  Availability,
  AvailabilityOverride,
  Booking,
  BookingListItem,
  BookingStatus,
  CancellationRecord,
  CancellationSummary,
  DashboardSummary,
  DashboardPerformanceComparison,
  DashboardPerformancePeriod,
  MonthlyRevenue,
  Offer,
  OfferWithStatus,
  Pagination,
  Property,
  PropertyAnalytics,
  PropertyListItem,
  RatePlan,
  Review,
} from "@/types/stays";

// Exact match only: config/dataSource.ts guarantees "mock" | "api".
export const staysUsesMockData = config.stays.dataSource === "mock";

const BASE = "/stays/supplier";

type Params = Record<string, unknown>;

/* ── Query keys ──────────────────────────────────────────────────────────── */
export const STAYS_KEYS = {
  dashboard: ["stays", "dashboard"] as const,
  properties: (filters: Params = {}) => ["stays", "properties", filters] as const,
  property: (id: string | null | undefined) => ["stays", "property", id] as const,
  bookings: (filters: Params = {}) => ["stays", "bookings", filters] as const,
  availability: (propertyId: string | null | undefined, from: string, to: string) =>
    ["stays", "availability", propertyId, from, to] as const,
  offers: (filter = "All") => ["stays", "offers", filter] as const,
  reviews: (filter = "All") => ["stays", "reviews", filter] as const,
  analytics: (period: unknown) => ["stays", "analytics", period] as const,
  cancellation: (days: number, propertyId?: string | null) =>
    ["stays", "cancellation", days, propertyId || "all"] as const,
  cancellationRecords: (filters: Params = {}) => ["stays", "cancellation", "records", filters] as const,
};

const requestConfig = { skipGlobalErrorHandler: true };

/** Stays prices are USD-only; normalise any API currency code at the boundary. */
function withUsd<T extends { currency?: unknown }>(value: T): T {
  return { ...value, currency: "USD" } as T;
}

function usdDashboard(data: DashboardSummary): DashboardSummary {
  const gross = Number(data.stats?.grossBookingValue) || 0;
  const bookings = Array.isArray(data.currencies)
    ? data.currencies.reduce((total, row) => total + (Number(row.bookings) || 0), 0)
    : 0;
  return {
    ...data,
    currency: "USD",
    mixedCurrencies: false,
    currencies: [{ currency: "USD", grossBookingValue: gross, bookings }],
    recentBookings: (data.recentBookings || []).map(withUsd),
  };
}

function usdAnalyticsSummary(data: AnalyticsSummary): AnalyticsSummary {
  const totalEarnings = Number(data.earnings?.totalEarnings) || 0;
  const bookings = Array.isArray(data.earnings?.currencies)
    ? data.earnings.currencies.reduce((total, row) => total + (Number(row.bookings) || 0), 0)
    : 0;
  return {
    ...data,
    earnings: {
      ...data.earnings,
      currency: "USD",
      mixedCurrencies: false,
      currencies: [{ currency: "USD", totalEarnings, bookings }],
    },
  };
}

function withUsdRevenue(row: PropertyAnalytics): PropertyAnalytics {
  return { ...row, currency: "USD", revenueByCurrency: { USD: Number(row.revenue) || 0 } };
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */
export async function fetchStaysDashboard(
  params: { period?: DashboardPerformancePeriod; compare?: DashboardPerformanceComparison } = {},
): Promise<DashboardSummary> {
  if (staysUsesMockData) return usdDashboard(await staysMock.getDashboard(params));
  const res = await api.get(`${BASE}/dashboard`, { ...requestConfig, params });
  const data = res.data?.data;
  return data ? usdDashboard(data) : data;
}

/* ── Properties ──────────────────────────────────────────────────────────── */
export async function listProperties(params: { status?: string; query?: string } = {}): Promise<PropertyListItem[]> {
  if (staysUsesMockData) return (await staysMock.listProperties(params)).map(withUsd);
  const res = await api.get(`${BASE}/properties`, { ...requestConfig, params });
  return (res.data?.data?.properties || []).map(withUsd);
}

export async function getProperty(id: string): Promise<Property> {
  if (staysUsesMockData) return withUsd(await staysMock.getProperty(id));
  const res = await api.get(`${BASE}/properties/${id}`, requestConfig);
  return withUsd(res.data?.data?.property);
}

export async function createProperty(payload: Partial<Property>): Promise<Property> {
  const usdPayload = { ...payload, currency: "USD" as const };
  if (staysUsesMockData) return withUsd(await staysMock.createProperty(usdPayload));
  const res = await api.post(`${BASE}/properties`, usdPayload, requestConfig);
  return withUsd(res.data?.data?.property);
}

export async function updateProperty(id: string, patch: Partial<Property>): Promise<Property> {
  const usdPatch = { ...patch, currency: "USD" as const };
  if (staysUsesMockData) return withUsd(await staysMock.updateProperty(id, usdPatch));
  const res = await api.patch(`${BASE}/properties/${id}`, usdPatch, requestConfig);
  return withUsd(res.data?.data?.property);
}

export async function submitProperty(id: string): Promise<Property> {
  if (staysUsesMockData) return withUsd(await staysMock.submitProperty(id));
  const res = await api.post(`${BASE}/properties/${id}/submit-for-review`, {}, requestConfig);
  return withUsd(res.data?.data?.property);
}

export async function deleteProperty(id: string): Promise<unknown> {
  if (staysUsesMockData) return staysMock.deleteProperty(id);
  const res = await api.delete(`${BASE}/properties/${id}`, requestConfig);
  return res.data?.data;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = String(dataUrl).split(",");
  const mime = /data:([^;]+)/.exec(meta)?.[1] || "image/jpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export async function addPropertyPhotos(id: string, dataUrls: string[]): Promise<string[]> {
  if (staysUsesMockData) return staysMock.addPhotos(id, dataUrls);

  // Live: the builder already holds data URLs (it reads files in the browser).
  // Convert them back to Blobs and send multipart — a 5-photo batch can exceed
  // the backend's JSON body limit, and multipart streams straight to Cloudinary.
  const allDataUrls =
    Array.isArray(dataUrls) && dataUrls.every((value) => typeof value === "string" && value.startsWith("data:image/"));

  if (!allDataUrls) {
    const res = await api.post(`${BASE}/properties/${id}/photos`, { photos: dataUrls }, requestConfig);
    return res.data?.data?.photos || [];
  }

  const form = new FormData();
  dataUrls.forEach((dataUrl, index) => {
    const blob = dataUrlToBlob(dataUrl);
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    form.append("photos", blob, `property-${index}.${ext}`);
  });

  // Let the browser set the multipart boundary; do not set Content-Type here.
  const res = await api.post(`${BASE}/properties/${id}/photos`, form, requestConfig);
  return res.data?.data?.photos || [];
}

export async function removePropertyPhoto(id: string, index: number): Promise<string[]> {
  if (staysUsesMockData) return staysMock.removePhoto(id, index);
  const res = await api.delete(`${BASE}/properties/${id}/photos/${index}`, requestConfig);
  return res.data?.data?.photos || [];
}

/* ── Rate plans ─────────────────────────────────────────────────────────── */
export async function saveRatePlan(propertyId: string, plan: Partial<RatePlan>): Promise<Property> {
  if (staysUsesMockData) return withUsd(await staysMock.saveRatePlan(propertyId, plan));
  const res = plan.id
    ? await api.patch(`${BASE}/properties/${propertyId}/rate-plans/${plan.id}`, plan, requestConfig)
    : await api.post(`${BASE}/properties/${propertyId}/rate-plans`, plan, requestConfig);
  return withUsd(res.data?.data?.property);
}

export async function deleteRatePlan(propertyId: string, planId: string): Promise<Property> {
  if (staysUsesMockData) return withUsd(await staysMock.deleteRatePlan(propertyId, planId));
  const res = await api.delete(`${BASE}/properties/${propertyId}/rate-plans/${planId}`, requestConfig);
  return withUsd(res.data?.data?.property);
}

/* ── Availability ────────────────────────────────────────────────────────── */
export async function getAvailability(
  propertyId: string,
  { from, to }: { from?: string; to?: string } = {},
): Promise<Availability> {
  if (staysUsesMockData) return withUsd(await staysMock.getAvailability(propertyId, { from, to }));
  const res = await api.get(`${BASE}/properties/${propertyId}/availability`, {
    ...requestConfig,
    params: { from, to },
  });
  return withUsd(res.data?.data);
}

export async function setAvailabilityCell(
  propertyId: string,
  { roomId, date, values }: { roomId: string; date: string; values: AvailabilityOverride },
): Promise<unknown> {
  if (staysUsesMockData) return staysMock.setAvailabilityCell(propertyId, { roomId, date, values });
  const res = await api.put(`${BASE}/properties/${propertyId}/availability`, { roomId, date, ...values }, requestConfig);
  return res.data?.data;
}

/** Removes the room/date override so the room's defaults apply again. */
export async function clearAvailabilityCell(
  propertyId: string,
  { roomId, date }: { roomId: string; date: string },
): Promise<unknown> {
  if (staysUsesMockData) return staysMock.clearAvailabilityCell(propertyId, { roomId, date });
  const res = await api.delete(`${BASE}/properties/${propertyId}/availability`, {
    ...requestConfig,
    params: { roomId, date },
  });
  return res.data?.data;
}

async function writeAvailabilityCells(
  propertyId: string,
  cells: Array<{ roomId: string; date: string; values: AvailabilityOverride }>,
): Promise<number> {
  let written = 0;
  for (let index = 0; index < cells.length; index += 8) {
    const chunk = cells.slice(index, index + 8);
    await Promise.all(
      chunk.map(({ roomId, date, values }) =>
        api.put(
          `${BASE}/properties/${propertyId}/availability`,
          { roomId, date, ...values },
          requestConfig,
        ),
      ),
    );
    written += chunk.length;
  }
  return written;
}

/** Applies the same availability values to every selected room/date. */
export async function setAvailabilityRange(
  propertyId: string,
  {
    roomIds,
    from,
    to,
    weekdays,
    values,
  }: { roomIds: string[]; from: string; to: string; weekdays?: number[]; values: AvailabilityOverride },
): Promise<{ cells: number }> {
  if (staysUsesMockData) return staysMock.setAvailabilityRange(propertyId, { roomIds, from, to, weekdays, values });

  const days = isoDaysBetween(from, to).filter(
    (date) => !weekdays || weekdays.includes(weekdayOf(date)),
  );
  const cells = roomIds.flatMap((roomId) =>
    days.map((date) => ({ roomId, date, values })),
  );
  return { cells: await writeAvailabilityCells(propertyId, cells) };
}

export type CopyAvailabilityFields = {
  price?: boolean;
  count?: boolean;
  minStay?: boolean;
  maxStay?: boolean;
  closed?: boolean;
  closedArrival?: boolean;
  closedDeparture?: boolean;
};

/** Copies selected availability fields from one date range to a target range. */
export async function copyAvailabilityRange(
  propertyId: string,
  {
    roomIds,
    from,
    to,
    targetFrom,
    targetTo,
    weekdays,
    fields = {},
    adjustment = null,
    overwrite = true,
  }: {
    roomIds: string[];
    from: string;
    to: string;
    targetFrom: string;
    targetTo?: string;
    weekdays?: number[];
    fields?: CopyAvailabilityFields;
    adjustment?: CopyRateAdjustment | null;
    overwrite?: boolean;
  },
): Promise<{ cells: number }> {
  if (staysUsesMockData) {
    return staysMock.copyAvailabilityRange(propertyId, {
      roomIds,
      from,
      to,
      targetFrom,
      targetTo,
      weekdays,
      fields,
      adjustment,
      overwrite,
    });
  }

  const sourceDays = isoDaysBetween(from, to);
  if (!sourceDays.length || !targetFrom) return { cells: 0 };
  const targetRangeTo = targetTo || shiftISODays(targetFrom, sourceDays.length - 1);
  const [{ overrides }, property, targetAvailability] = await Promise.all([
    getAvailability(propertyId, { from, to }),
    getProperty(propertyId),
    overwrite ? Promise.resolve(null) : getAvailability(propertyId, { from: targetFrom, to: targetRangeTo }),
  ]);

  const selected = {
    price: fields.price !== false,
    count: fields.count !== false,
    minStay: Boolean(fields.minStay),
    maxStay: Boolean(fields.maxStay),
    closed: Boolean(fields.closed),
    closedArrival: Boolean(fields.closedArrival),
    closedDeparture: Boolean(fields.closedDeparture),
  };
  const rooms = property.rooms.filter((room) => roomIds.includes(room.id));
  const targetOverrides = targetAvailability?.overrides ?? {};
  const pairs = copyDatePairs({ from, to, targetFrom, targetTo: targetRangeTo, weekdays });
  const cells: Array<{ roomId: string; date: string; values: AvailabilityOverride }> = [];

  for (const room of rooms) {
    for (const { source: sourceDate, target: date } of pairs) {
      if (!overwrite && targetOverrides[`${room.id}|${date}`]) continue;
      const source = overrides[`${room.id}|${sourceDate}`] || {};
      const values: AvailabilityOverride = {};
      if (selected.price) {
        values.price = applyCopyAdjustment(source.price ?? room.price, adjustment);
      }
      if (selected.count) values.count = source.count ?? room.count;
      if (selected.minStay) values.minStay = source.minStay ?? 1;
      if (selected.maxStay) values.maxStay = source.maxStay ?? 30;
      if (selected.closed) values.closed = Boolean(source.closed);
      if (selected.closedArrival) values.closedArrival = Boolean(source.closedArrival);
      if (selected.closedDeparture) values.closedDeparture = Boolean(source.closedDeparture);
      cells.push({ roomId: room.id, date, values });
    }
  }

  return { cells: await writeAvailabilityCells(propertyId, cells) };
}

/* ── Bookings ────────────────────────────────────────────────────────────── */
export async function listStaysBookings(params: { status?: string } = {}): Promise<BookingListItem[]> {
  if (staysUsesMockData) return (await staysMock.listBookings(params)).map(withUsd);
  const res = await api.get(`${BASE}/bookings`, { ...requestConfig, params });
  return (res.data?.data?.bookings || []).map(withUsd);
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  if (staysUsesMockData) return withUsd(await staysMock.updateBookingStatus(id, status));
  const res = await api.patch(`${BASE}/bookings/${id}/status`, { status }, requestConfig);
  return withUsd(res.data?.data?.booking);
}

/** A supplier-recorded walk-in or phone reservation. */
export type CreateStayBookingPayload = {
  propertyId: string;
  roomId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  amount?: number;
};

export async function createStayBooking(payload: CreateStayBookingPayload): Promise<Booking> {
  if (staysUsesMockData) return withUsd(await staysMock.createBooking(payload));
  const res = await api.post(`${BASE}/bookings`, payload, requestConfig);
  return withUsd(res.data?.data?.booking);
}

/* ── Offers ──────────────────────────────────────────────────────────────── */
export async function listOffers(params: { filter?: string } = {}): Promise<OfferWithStatus[]> {
  if (staysUsesMockData) return staysMock.listOffers(params);
  const res = await api.get(`${BASE}/offers`, { ...requestConfig, params });
  return res.data?.data?.offers || [];
}

export async function getOffer(id: string): Promise<OfferWithStatus | null> {
  if (staysUsesMockData) return staysMock.getOffer(id);
  const res = await api.get(`${BASE}/offers/${id}`, requestConfig);
  return res.data?.data?.offer;
}

export async function saveOffer(offer: Partial<Offer>): Promise<OfferWithStatus[]> {
  if (staysUsesMockData) return staysMock.saveOffer(offer);
  const res = offer.id
    ? await api.patch(`${BASE}/offers/${offer.id}`, offer, requestConfig)
    : await api.post(`${BASE}/offers`, offer, requestConfig);
  return res.data?.data?.offers || [];
}

export async function toggleOffer(id: string): Promise<OfferWithStatus> {
  if (staysUsesMockData) return staysMock.toggleOffer(id);
  const res = await api.post(`${BASE}/offers/${id}/toggle`, {}, requestConfig);
  return res.data?.data?.offer;
}

export async function deleteOffer(id: string): Promise<unknown> {
  if (staysUsesMockData) return staysMock.deleteOffer(id);
  const res = await api.delete(`${BASE}/offers/${id}`, requestConfig);
  return res.data?.data;
}

/* ── Reviews ─────────────────────────────────────────────────────────────── */
export async function listStaysReviews(params: { filter?: string } = {}): Promise<Review[]> {
  if (staysUsesMockData) return staysMock.listReviews(params);
  const res = await api.get(`${BASE}/reviews`, { ...requestConfig, params });
  return res.data?.data?.reviews || [];
}

export async function replyToStaysReview(id: string, reply: string): Promise<Review> {
  if (staysUsesMockData) return staysMock.replyToReview(id, reply);
  const res = await api.post(`${BASE}/reviews/${id}/reply`, { reply }, requestConfig);
  return res.data?.data?.review;
}

/* ── Reporting ───────────────────────────────────────────────────────────── */
export async function fetchCancellationSummary(
  params: { days?: number; propertyId?: string } = {},
): Promise<CancellationSummary> {
  if (staysUsesMockData) return staysMock.getCancellationSummary(params);
  const res = await api.get(`${BASE}/cancellation`, { ...requestConfig, params });
  return res.data?.data;
}

export async function fetchCancellationRecords(
  params: Params = {},
): Promise<{ records: CancellationRecord[]; pagination: Pagination | null }> {
  if (staysUsesMockData) return staysMock.listCancellationRecords(params);
  const res = await api.get(`${BASE}/cancellation/records`, { ...requestConfig, params });
  const payload = res.data?.data || {};
  return {
    records: payload.records || [],
    pagination: payload.pagination || null,
  };
}

export async function fetchStaysAnalytics(params: Params = {}): Promise<unknown> {
  if (staysUsesMockData) return staysMock.getAnalytics(params);
  const res = await api.get(`${BASE}/analytics`, { ...requestConfig, params });
  return res.data?.data;
}

export async function fetchStaysAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  if (staysUsesMockData) {
    const data = await staysMock.getAnalyticsSummary();
    return data ? usdAnalyticsSummary(data) : null;
  }
  const res = await api.get(`${BASE}/analytics/summary`, requestConfig);
  const data = res.data?.data;
  return data ? usdAnalyticsSummary(data) : null;
}

export async function fetchStaysPropertyAnalytics(): Promise<PropertyAnalytics[]> {
  if (staysUsesMockData) return (await staysMock.getPropertyAnalytics()).map(withUsdRevenue);
  const res = await api.get(`${BASE}/analytics/properties`, requestConfig);
  return (res.data?.data?.properties || []).map(withUsdRevenue);
}

export async function fetchStaysMonthlyRevenue(months = 12): Promise<MonthlyRevenue[]> {
  if (staysUsesMockData) return staysMock.getMonthlyRevenue({ months });
  const res = await api.get(`${BASE}/analytics/monthly-revenue`, {
    ...requestConfig,
    params: { months },
  });
  return res.data?.data?.months || [];
}
