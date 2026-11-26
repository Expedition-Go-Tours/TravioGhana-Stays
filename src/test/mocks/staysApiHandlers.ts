import { http, HttpResponse } from 'msw';
import { config } from '@/config';
import { staysMock } from '@/features/stays/mock/store';

/**
 * The live Stays API, simulated from the demo dataset.
 *
 * Responses use the backend envelope (`{ data: { … } }`) and the RAW field
 * names each API module's live branch reads — e.g. finance earnings carry
 * `platformCommission` and `property.name`, which `financeApi` maps to
 * `commissionAmount` and `property`. These handlers are therefore the
 * contract the mapping code assumes; when the API status report shows the
 * real backend differs, fix the mapping and this file together.
 *
 * Not installed globally: tests opt in with `server.use(...staysApiHandlers())`.
 */
const API = config.api.baseURL.replace(/\/$/, '');
const S = `${API}/travioghana/supplier/stays`;
const SUPPLIER = `${API}/travioghana/supplier`;

const envelope = (data: unknown) => HttpResponse.json({ success: true, data });

export function staysApiHandlers() {
  return [
    http.get(`${S}/dashboard`, async ({ request }) => {
      const url = new URL(request.url);
      return envelope(
        await staysMock.getDashboard({
          period: url.searchParams.get('period') ?? undefined,
          compare: url.searchParams.get('compare') ?? undefined,
        }),
      );
    }),
    http.get(`${S}/properties`, async () => envelope({ properties: await staysMock.listProperties() })),
    http.get(`${S}/properties/:id`, async ({ params }) => {
      try {
        return envelope({ property: await staysMock.getProperty(String(params.id)) });
      } catch {
        return HttpResponse.json({ message: 'Property not found' }, { status: 404 });
      }
    }),
    http.get(`${S}/properties/:id/availability`, async ({ params }) =>
      envelope(await staysMock.getAvailability(String(params.id))),
    ),
    http.get(`${S}/bookings`, async () => envelope({ bookings: await staysMock.listBookings() })),
    http.get(`${S}/offers`, async () => envelope({ offers: await staysMock.listOffers() })),
    http.get(`${S}/offers/:id`, async ({ params }) => envelope({ offer: await staysMock.getOffer(String(params.id)) })),
    http.get(`${S}/reviews`, async () => envelope({ reviews: await staysMock.listReviews() })),
    http.get(`${S}/cancellation`, async () => envelope(await staysMock.getCancellationSummary())),
    http.get(`${S}/cancellation/records`, async () => envelope(await staysMock.listCancellationRecords())),
    http.get(`${S}/analytics/summary`, async () => envelope(await staysMock.getAnalyticsSummary())),
    http.get(`${S}/analytics/properties`, async () => envelope({ properties: await staysMock.getPropertyAnalytics() })),
    http.get(`${S}/analytics/monthly-revenue`, async () =>
      envelope({ months: await staysMock.getMonthlyRevenue({ months: 12 }) }),
    ),

    http.get(`${S}/finance/summary`, async () => envelope(await staysMock.getFinanceSummary())),
    http.get(`${S}/finance/earnings`, async () => {
      const { earnings, pagination } = await staysMock.getFinanceEarnings();
      return envelope({
        earnings: earnings.map((row: Record<string, unknown>) => ({
          ...row,
          platformCommission: row.commissionAmount,
          property: { name: row.property },
          customer: { name: row.customer },
        })),
        pagination,
      });
    }),
    http.get(`${S}/finance/payouts/requests`, async () => {
      const { requests, pagination } = await staysMock.getPayoutRequests();
      return envelope({
        requests: requests.map((row: Record<string, unknown>) => ({ ...row, payoutMethod: { type: 'BANK_TRANSFER' } })),
        pagination,
      });
    }),
    http.get(`${S}/finance/payout-settings`, async () => envelope(await staysMock.getPayoutSettings())),
    http.get(`${S}/finance/charges`, async () => {
      const { charges, openTotals } = await staysMock.getFinanceCharges();
      return envelope({
        charges,
        // The API sends open totals as a currency → amount map.
        openTotals: Object.fromEntries(openTotals.map((t: { currency: string; amount: number }) => [t.currency, t.amount])),
      });
    }),
    http.get(`${S}/finance/disputes`, async () => {
      const { disputes, pagination } = await staysMock.getFinanceDisputes();
      return envelope({
        disputes: disputes.map((row: Record<string, unknown>) => ({
          ...row,
          booking: {
            bookingNumber: row.bookingNumber,
            travelDate: row.travelDate,
            grossAmount: row.grossAmount,
            currency: row.currency,
            property: { name: row.propertyTitle },
          },
        })),
        pagination,
      });
    }),
    http.get(`${S}/payout-methods/me`, async () => envelope({ methods: await staysMock.listPayoutMethods() })),
    http.get(`${S}/refund-claims/supplier`, () =>
      envelope({
        claims: [
          {
            id: 'claim-1',
            claimNumber: 'RC-2026-001',
            reason: 'NOT_AS_DESCRIBED',
            type: 'PARTIAL',
            requestedAmount: '120.00',
            status: 'SUBMITTED',
            createdAt: '2026-10-01T10:00:00.000Z',
            booking: {
              bookingNumber: 'TG-S-20493',
              grossAmount: '3000.00',
              currency: 'USD',
              customer: { name: 'Sarah Johnson', email: 'sarah.johnson@example.com' },
              property: { name: 'Akwaaba Coast Hotel' },
            },
          },
        ],
      }),
    ),
    http.get(`${S}/verification`, async () => envelope(await staysMock.getVerification())),

    http.get(`${S}/conversations`, async ({ request }) => {
      if (new URL(request.url).searchParams.get('domain') !== 'stays') {
        return HttpResponse.json({ message: 'domain=stays is required' }, { status: 400 });
      }
      return envelope({ conversations: await staysMock.listConversations() });
    }),
    http.get(`${S}/conversations/:id/messages`, async ({ params }) =>
      envelope(await staysMock.listConversationMessages({ conversationId: String(params.id) })),
    ),
    http.get(`${S}/notifications`, async ({ request }) => {
      if (new URL(request.url).searchParams.get('domain') !== 'stays') {
        return HttpResponse.json({ message: 'domain=stays is required' }, { status: 400 });
      }
      return envelope(await staysMock.listNotifications());
    }),

    http.get(`${API}/users/me`, async () => envelope({ user: { id: 'u1', ...(await staysMock.getAccount()).user } })),
    http.get(`${SUPPLIER}/settings/business-profile`, async () => envelope((await staysMock.getAccount()).business)),
    http.get(`${SUPPLIER}/settings/notification-preferences`, async () => envelope(await staysMock.getNotificationPreferences())),
    http.get(`${SUPPLIER}/settings/notification-recipients`, async () =>
      envelope({ recipients: await staysMock.listNotificationRecipients() }),
    ),
    http.get(`${SUPPLIER}/settings/tax-info`, async () => envelope(await staysMock.getTaxInfo())),
    http.get(`${SUPPLIER}/payouts`, async () => {
      const { requests } = await staysMock.getPayoutRequests();
      return envelope({ payouts: requests.map((r: Record<string, unknown>) => ({ ...r, paidAt: r.completedAt })) });
    }),
    http.get(`${SUPPLIER}/settings/team/members`, async () => envelope({ members: await staysMock.listTeamMembers() })),
  ];
}
