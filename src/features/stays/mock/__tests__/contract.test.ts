import { beforeEach, describe, expect, it } from 'vitest';
import { staysMock } from '../store';

/**
 * Contract test: every read method of the mock store returns the shape the
 * domain types in `src/types/stays.ts` describe.
 *
 * The seed is checked against those types at compile time (`seedStays:
 * StaysMockDb`). The store is still untyped (`@ts-nocheck`, typed in Task 20),
 * so its derived and aggregated responses are checked here at runtime. The key
 * lists mirror the required (non-optional) fields of each type.
 */
const REQUIRED = {
  Property: ['id', 'name', 'type', 'status', 'step', 'city', 'country', 'photos', 'rooms', 'ratePlans', 'currency', 'pricePerNight'],
  RoomType: ['id', 'kind', 'name', 'count', 'adults', 'children', 'beds', 'price'],
  RatePlan: ['id', 'roomId', 'name', 'price', 'minStay', 'maxStay', 'cancellation'],
  BookingListItem: ['id', 'guest', 'propertyId', 'room', 'from', 'to', 'amount', 'status', 'guests', 'propertyName'],
  OfferWithStatus: ['id', 'name', 'offerType', 'discountType', 'startDate', 'endDate', 'isActive', 'targets', 'status', 'propertyName'],
  Review: ['id', 'guest', 'rating', 'text', 'reply'],
  Conversation: ['id', 'type', 'updatedAt', 'unreadCount', 'participants', 'messages'],
  Message: ['id', 'conversationId', 'senderId', 'sender', 'content', 'createdAt'],
  Notification: ['id', 'type', 'title', 'message', 'data', 'read', 'createdAt'],
  Earning: ['id', 'bookingId', 'bookingNumber', 'travelDate', 'grossAmount', 'supplierPayout', 'commissionAmount', 'currency', 'payoutStatus', 'property'],
  PayoutRequest: ['id', 'requestNumber', 'amount', 'currency', 'bookingCount', 'status', 'createdAt'],
  PayoutMethod: ['id', 'type', 'verified', 'status', 'country', 'currency', 'createdAt'],
  Charge: ['id', 'amount', 'currency', 'reason', 'status', 'bookingId'],
  Dispute: ['id', 'disputeNumber', 'reason', 'status', 'refundAmount', 'bookingId', 'currency'],
  FinanceSummary: ['currency', 'mixedCurrencies', 'availableBalance', 'pendingClearance', 'inReview', 'paidOut', 'currencies', 'payoutPlan'],
  PayoutPlan: ['autoManaged', 'defaultCycle', 'scheduleLabel', 'nextRunAt', 'hasVerifiedPayoutMethod', 'options'],
  DashboardSummary: ['stats', 'currency', 'mixedCurrencies', 'currencies', 'cancellation', 'actionRequired', 'recentBookings', 'topProperties'],
  CancellationSummary: ['days', 'cancellationRate', 'eligibleBookings', 'cancelled', 'status', 'bookingValueLost'],
  CancellationRecord: ['id', 'travelDate', 'reason', 'bookingReference', 'productName', 'bookingValue'],
  AnalyticsSummary: ['properties', 'bookings', 'earnings', 'reviews'],
  PropertyAnalytics: ['propertyId', 'name', 'bookings', 'revenue', 'currency', 'revenueByCurrency'],
  MonthlyRevenue: ['month', 'revenue'],
  Verification: ['profile', 'requirements'],
} as const;

function expectShape(value: unknown, type: keyof typeof REQUIRED) {
  expect(value, `${type} is an object`).toBeTypeOf('object');
  expect(value).not.toBeNull();
  for (const key of REQUIRED[type]) {
    expect(value, `${type}.${key}`).toHaveProperty(key);
  }
}

function expectEach(rows: unknown, type: keyof typeof REQUIRED) {
  expect(Array.isArray(rows), `${type}[] is an array`).toBe(true);
  expect((rows as unknown[]).length, `${type}[] is not empty in the seed`).toBeGreaterThan(0);
  for (const row of rows as unknown[]) expectShape(row, type);
}

beforeEach(() => staysMock.reset());

describe('mock store matches the domain contract', () => {
  it('properties, rooms and rate plans', async () => {
    const list = await staysMock.listProperties();
    expectEach(list, 'Property');
    for (const row of list) expect(row).toHaveProperty('bookings');
    const property = await staysMock.getProperty(list[0].id);
    expectShape(property, 'Property');
    expectEach(property.rooms, 'RoomType');
    expectEach(property.ratePlans, 'RatePlan');
  });

  it('availability', async () => {
    const availability = await staysMock.getAvailability('p1');
    expect(availability).toHaveProperty('overrides');
    expect(availability).toHaveProperty('currency');
  });

  it('bookings, offers and reviews', async () => {
    expectEach(await staysMock.listBookings(), 'BookingListItem');
    expectEach(await staysMock.listOffers(), 'OfferWithStatus');
    expectShape(await staysMock.getOffer('offer-1'), 'OfferWithStatus');
    expectEach(await staysMock.listReviews(), 'Review');
  });

  it('conversations and message pages', async () => {
    const conversations = await staysMock.listConversations();
    expectEach(conversations, 'Conversation');
    const page = await staysMock.listConversationMessages({ conversationId: conversations[0].id });
    expect(page).toHaveProperty('cursor');
    expect(page).toHaveProperty('hasMore');
    expectEach(page.messages, 'Message');
  });

  it('notifications and verification', async () => {
    const list = await staysMock.listNotifications();
    expect(list).toHaveProperty('unreadCount');
    expectEach(list.notifications, 'Notification');
    const verification = await staysMock.getVerification();
    expectShape(verification, 'Verification');
  });

  it('finance', async () => {
    const summary = await staysMock.getFinanceSummary();
    expectShape(summary, 'FinanceSummary');
    expectShape(summary.payoutPlan, 'PayoutPlan');
    const earnings = await staysMock.getFinanceEarnings();
    expect(earnings).toHaveProperty('pagination');
    expectEach(earnings.earnings, 'Earning');
    expectEach((await staysMock.getPayoutRequests()).requests, 'PayoutRequest');
    expectEach(await staysMock.listPayoutMethods(), 'PayoutMethod');
    expectShape(await staysMock.getPayoutSettings(), 'PayoutPlan');
    const charges = await staysMock.getFinanceCharges();
    expect(charges).toHaveProperty('openTotals');
    expectEach(charges.charges, 'Charge');
    expectEach((await staysMock.getFinanceDisputes()).disputes, 'Dispute');
    expect(Array.isArray(await staysMock.getSupplierClaims())).toBe(true);
  });

  it('dashboard, cancellation and analytics', async () => {
    expectShape(await staysMock.getDashboard(), 'DashboardSummary');
    expectShape(await staysMock.getCancellationSummary(), 'CancellationSummary');
    const records = await staysMock.listCancellationRecords();
    expect(records).toHaveProperty('pagination');
    expectEach(records.records, 'CancellationRecord');
    expectShape(await staysMock.getAnalyticsSummary(), 'AnalyticsSummary');
    expectEach(await staysMock.getPropertyAnalytics(), 'PropertyAnalytics');
    expectEach(await staysMock.getMonthlyRevenue({ months: 3 }), 'MonthlyRevenue');
  });
});
