import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { staysApiHandlers } from '@/test/mocks/staysApiHandlers';
import { staysMock } from '@/features/stays/mock/store';
import { config } from '@/config';
import api from '@/lib/axios';
import { PROBES, runProbes, summarize } from '../apiProbes';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));

const API = config.api.baseURL.replace(/\/$/, '');

beforeEach(() => {
  staysMock.reset();
  localStorage.setItem('auth_token', 'token-1');
  server.use(...staysApiHandlers());
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('API status probes', () => {
  it('only ever sends GET requests', async () => {
    const writes = (['post', 'put', 'patch', 'delete'] as const).map((method) => vi.spyOn(api, method));
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => requests.push(request.method));

    await runProbes();

    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
    expect(requests.length).toBeGreaterThan(0);
    expect(new Set(requests)).toEqual(new Set(['GET']));
    server.events.removeAllListeners();
  });

  it('reports every endpoint OK against an API that matches the contract', async () => {
    const results = await runProbes();
    const failing = results.filter((r) => r.outcome !== 'ok');
    expect(failing, JSON.stringify(failing, null, 2)).toEqual([]);
    expect(results).toHaveLength(PROBES.length);
    expect(summarize(results)).toMatchObject({ total: PROBES.length, ok: PROBES.length });
  });

  it('chains ids: a property-scoped probe uses the first listed property', async () => {
    const results = await runProbes();
    expect(results.find((r) => r.id === 'property')?.url).toBe('/travioghana/supplier/stays/properties/p1');
  });

  it('marks a 404 on a stays endpoint as not available, not as an error', async () => {
    server.use(http.get(`${API}/travioghana/supplier/stays/reviews`, () => HttpResponse.json({}, { status: 404 })));
    const results = await runProbes();
    expect(results.find((r) => r.id === 'reviews')).toMatchObject({ outcome: 'unavailable', status: 404 });
  });

  it('reports a renamed field as a shape mismatch', async () => {
    server.use(
      http.get(`${API}/travioghana/supplier/stays/bookings`, () =>
        HttpResponse.json({ data: { bookings: [{ id: 'b1', guestName: 'x', propertyId: 'p1', from: 'a', to: 'b', amount: 1, status: 'New' }] } }),
      ),
    );
    const result = (await runProbes()).find((r) => r.id === 'bookings');
    expect(result?.outcome).toBe('shape-mismatch');
    expect(result?.issues).toContainEqual({ path: 'data.bookings[].guest', problem: 'missing' });
  });

  it('skips dependent probes when the list they need is empty', async () => {
    server.use(http.get(`${API}/travioghana/supplier/stays/properties`, () => HttpResponse.json({ data: { properties: [] } })));
    const results = await runProbes();
    expect(results.find((r) => r.id === 'property')?.outcome).toBe('skipped');
    expect(results.find((r) => r.id === 'availability')?.outcome).toBe('skipped');
  });

  it('notes non-USD currencies without failing the endpoint', async () => {
    server.use(
      http.get(`${API}/travioghana/supplier/stays/finance/summary`, async () => {
        const summary = await staysMock.getFinanceSummary();
        return HttpResponse.json({ data: { ...summary, currency: 'EUR' } });
      }),
    );
    const result = (await runProbes()).find((r) => r.id === 'finance-summary');
    expect(result?.outcome).toBe('ok');
    expect(result?.notes.join(' ')).toMatch(/EUR/);
  });

  it('never puts response bodies in the report', async () => {
    const results = await runProbes();
    const text = JSON.stringify(results);
    expect(text).not.toMatch(/Sarah Johnson|sarah\.johnson@example\.com|Akwaaba Coast Ltd/);
  });
});
