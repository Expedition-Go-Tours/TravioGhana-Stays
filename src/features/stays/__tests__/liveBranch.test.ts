import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { staysApiHandlers } from '@/test/mocks/staysApiHandlers';
import { staysMock } from '@/features/stays/mock/store';
import { config } from '@/config';

/**
 * The live (api) branch of every Stays API module, against the simulated
 * backend. The suite runs in mock mode, so the config is swapped to `api`
 * before the modules load.
 */
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config')>();
  const config = { ...actual.config, stays: { ...actual.config.stays, dataSource: 'api' as const } };
  return { ...actual, config, default: config };
});

type Modules = {
  stays: typeof import('../api');
  finance: typeof import('../financeApi');
  settings: typeof import('../settingsApi');
  customers: typeof import('../customersApi');
  verification: typeof import('../verification/api');
  notifications: typeof import('../notifications/api');
  queryState: typeof import('@/lib/queryState');
};
let m: Modules;
const API = config.api.baseURL.replace(/\/$/, '');

beforeAll(async () => {
  m = {
    stays: await import('../api'),
    finance: await import('../financeApi'),
    settings: await import('../settingsApi'),
    customers: await import('../customersApi'),
    verification: await import('../verification/api'),
    notifications: await import('../notifications/api'),
    queryState: await import('@/lib/queryState'),
  };
});

beforeEach(() => {
  staysMock.reset();
  localStorage.setItem('auth_token', 'token-1');
  server.use(...staysApiHandlers());
});

afterEach(() => localStorage.clear());

describe('live branch', () => {
  it('is really the api branch', () => {
    expect(m.stays.staysUsesMockData).toBe(false);
  });

  it('stays/api.ts unwraps each envelope', async () => {
    expect((await m.stays.fetchStaysDashboard()).stats.liveProperties).toBe(1);
    expect((await m.stays.listProperties())[0]).toMatchObject({ id: 'p1', name: 'Akwaaba Coast Hotel' });
    expect(await m.stays.getProperty('p1')).toMatchObject({ id: 'p1' });
    expect(await m.stays.getAvailability('p1', {})).toHaveProperty('overrides');
    expect((await m.stays.listStaysBookings()).length).toBeGreaterThan(0);
    expect((await m.stays.listOffers())[0]).toHaveProperty('discountType');
    expect(await m.stays.getOffer('offer-1')).toMatchObject({ id: 'offer-1' });
    expect((await m.stays.listStaysReviews())[0]).toHaveProperty('rating');
    expect(await m.stays.fetchCancellationSummary()).toHaveProperty('cancellationRate');
    expect((await m.stays.fetchCancellationRecords()).records.length).toBeGreaterThan(0);
    expect(await m.stays.fetchStaysAnalyticsSummary()).toHaveProperty('earnings');
    expect((await m.stays.fetchStaysPropertyAnalytics())[0]).toHaveProperty('revenue');
    expect(await m.stays.fetchStaysMonthlyRevenue(12)).toHaveLength(12);
  });

  it('financeApi.ts maps raw finance fields', async () => {
    expect(await m.finance.fetchFinanceSummary()).toHaveProperty('availableBalance');
    const { earnings } = await m.finance.fetchFinanceEarnings();
    expect(earnings[0]).toMatchObject({ property: 'Akwaaba Coast Hotel', currency: 'USD' });
    expect(earnings[0].commissionAmount).toBeGreaterThan(0);
    expect((await m.finance.fetchPayoutRequests()).requests[0]).toMatchObject({ method: 'BANK TRANSFER' });
    expect(await m.finance.fetchPayoutSettings()).toHaveProperty('options');
    const charges = await m.finance.getFinanceCharges();
    expect(charges.openTotals).toEqual([{ currency: 'USD', amount: expect.any(Number) }]);
    expect((await m.finance.fetchFinanceDisputes()).disputes[0]).toMatchObject({ propertyTitle: 'Akwaaba Coast Hotel' });
    expect((await m.finance.fetchPayoutMethods())[0]).toHaveProperty('currency');
    const [claim] = await m.finance.fetchSupplierClaims('ALL');
    expect(claim).toMatchObject({ requestedAmount: 120, booking: { total: 3000, currency: 'USD', customerName: 'Sarah Johnson' } });
  });

  it('customers, verification and notifications', async () => {
    const [conversation] = await m.customers.listStaysConversations();
    expect(conversation).toMatchObject({ id: 'conv-1' });
    expect((await m.customers.listStaysConversationMessages('conv-1')).messages.length).toBeGreaterThan(0);
    expect((await m.verification.loadStaysVerification()).profile.documents.length).toBeGreaterThan(0);
    const inbox = await m.notifications.fetchStaysNotifications();
    expect(inbox.notifications.length).toBeGreaterThan(0);
    expect(inbox.unreadCount).toBeGreaterThan(0);
  });

  it('scopes chat and notifications to the Stays product domain', async () => {
    const urls: string[] = [];
    server.events.on('request:start', ({ request }) => urls.push(request.url));
    try {
      await m.customers.listStaysConversations();
      await m.notifications.fetchStaysNotifications();
    } finally {
      server.events.removeAllListeners();
    }

    const domainOf = (path: string) =>
      urls
        .map((url) => new URL(url))
        .find((url) => url.pathname.endsWith(path))
        ?.searchParams.get('domain');

    expect(domainOf('/stays/conversations')).toBe('stays');
    expect(domainOf('/stays/notifications')).toBe('stays');
  });

  it('settingsApi.ts', async () => {
    expect(await m.settings.fetchCurrentUser()).toMatchObject({ email: 'stays@akwaabacoast.com' });
    expect(await m.settings.fetchBusinessProfile()).toHaveProperty('businessInfo');
    expect(await m.settings.fetchNotificationPreferences()).toHaveProperty('emailNotifications');
    expect((await m.settings.fetchNotificationRecipients()).length).toBe(2);
    // The Tax tab reads `data.taxInfo` (StaysSettingsPage TaxTab).
    expect(await m.settings.fetchTaxInfo()).toHaveProperty('taxInfo.taxId');
    expect((await m.settings.fetchPayouts()).payouts.length).toBeGreaterThan(0);
    expect((await m.settings.fetchTeamMembers()).length).toBe(3);
  });

  it('a 404 from a stays endpoint becomes the "unavailable" query state', async () => {
    server.use(
      http.get(`${API}/travioghana/supplier/stays/dashboard`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    const error = await m.stays.fetchStaysDashboard().catch((e: unknown) => e);
    expect(m.queryState.queryStatus({ isError: true, error })).toBe('unavailable');
    expect(m.queryState.shouldRetryQuery(0, error)).toBe(false);
  });

  it('a 500 stays an error, and is retried once', async () => {
    server.use(
      http.get(`${API}/travioghana/supplier/stays/dashboard`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    const error = await m.stays.fetchStaysDashboard().catch((e: unknown) => e);
    expect(m.queryState.queryStatus({ isError: true, error })).toBe('error');
    expect(m.queryState.shouldRetryQuery(0, error)).toBe(true);
    expect(m.queryState.shouldRetryQuery(1, error)).toBe(false);
  }, 20_000);
});
