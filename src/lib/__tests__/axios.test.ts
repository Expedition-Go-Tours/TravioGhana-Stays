import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import config from '@/config';
import api, { isLiveWriteBlocked, retryPolicy, rewriteSupplierPath } from '../axios';
import { LIVE_WRITE_BLOCKED, resetErrorToastDedupe } from '../errorHandler';

const toast = vi.hoisted(() => ({ error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const BASE = config.api.baseURL;
const DASHBOARD = `${BASE}/travioghana/supplier/stays/dashboard`;
const BOOKINGS = `${BASE}/travioghana/supplier/stays/bookings`;

/** Serve `responses` in order (the last one repeats) and count the hits. */
function sequence(method: 'get' | 'post', url: string, responses: (() => Response)[]) {
  const hits = { count: 0 };
  server.use(
    http[method](url, () => {
      const respond = responses[Math.min(hits.count, responses.length - 1)];
      hits.count += 1;
      return respond();
    }),
  );
  return hits;
}

const ok = () => HttpResponse.json({ data: { ok: true } });
const serverError = () => HttpResponse.json({ message: 'boom' }, { status: 500 });
const unauthorized = () => HttpResponse.json({ message: 'expired' }, { status: 401 });

const originalDataSource = config.stays.dataSource;
const originalAllow = config.stays.allowLiveWrites;

beforeEach(() => {
  retryPolicy.baseDelayMs = 0;
  resetErrorToastDedupe();
  localStorage.setItem('auth_token', 'token-1');
  Object.values(toast).forEach((fn) => fn.mockClear());
});

afterEach(() => {
  localStorage.clear();
  config.stays.dataSource = originalDataSource;
  config.stays.allowLiveWrites = originalAllow;
  vi.restoreAllMocks();
});

describe('path rewrite', () => {
  it('maps stays and finance supplier paths into the Ghana namespace', () => {
    expect(rewriteSupplierPath('/stays/supplier/dashboard')).toBe('/travioghana/supplier/stays/dashboard');
    expect(rewriteSupplierPath('/finance/summary')).toBe('/travioghana/supplier/finance/summary');
    expect(rewriteSupplierPath('/auth/login')).toBe('/auth/login');
  });
});

describe('automatic retries', () => {
  it('retries a GET that fails with 5xx and succeeds', async () => {
    const hits = sequence('get', DASHBOARD, [serverError, serverError, ok]);
    const res = await api.get('/stays/supplier/dashboard');
    expect(res.data).toEqual({ data: { ok: true } });
    expect(hits.count).toBe(3);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('never retries a POST — a payout or booking cannot be sent twice', async () => {
    const hits = sequence('post', BOOKINGS, [serverError, ok]);
    await expect(api.post('/stays/supplier/bookings', { guest: 'x' })).rejects.toMatchObject({
      response: { status: 500 },
    });
    expect(hits.count).toBe(1);
  });

  it('gives up after the configured attempts and shows exactly one toast', async () => {
    const hits = sequence('get', DASHBOARD, [serverError]);
    await expect(api.get('/stays/supplier/dashboard')).rejects.toBeTruthy();
    expect(hits.count).toBe(config.api.retryAttempts + 1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('boom', expect.anything());
  });

  it('respects skipRetry', async () => {
    const hits = sequence('get', DASHBOARD, [serverError, ok]);
    await expect(api.get('/stays/supplier/dashboard', { skipRetry: true })).rejects.toBeTruthy();
    expect(hits.count).toBe(1);
  });

  it('stays silent when the caller handles its own errors', async () => {
    sequence('get', DASHBOARD, [serverError]);
    await expect(
      api.get('/stays/supplier/dashboard', { skipGlobalErrorHandler: true }),
    ).rejects.toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('token refresh', () => {
  it('still refreshes on a 401 that follows a 5xx retry', async () => {
    localStorage.setItem('refresh_token', 'refresh-1');
    const refresh = { count: 0 };
    server.use(
      http.post(`${BASE}/auth/refresh`, () => {
        refresh.count += 1;
        localStorage.setItem('auth_token', 'token-2');
        return HttpResponse.json({ data: { accessToken: 'token-2' } });
      }),
    );
    const authHeaders: (string | null)[] = [];
    let n = 0;
    server.use(
      http.get(DASHBOARD, ({ request }) => {
        authHeaders.push(request.headers.get('authorization'));
        n += 1;
        if (n === 1) return serverError();
        if (n === 2) return unauthorized();
        return ok();
      }),
    );

    const res = await api.get('/stays/supplier/dashboard');
    expect(res.status).toBe(200);
    expect(refresh.count).toBe(1);
    expect(authHeaders).toEqual(['Bearer token-1', 'Bearer token-1', 'Bearer token-2']);
  });
});

describe('auth guard', () => {
  it('cancels a stays request locally when there is no token', async () => {
    localStorage.removeItem('auth_token');
    const hits = sequence('get', DASHBOARD, [ok]);
    await expect(api.get('/stays/supplier/dashboard')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(hits.count).toBe(0);
  });

  it('applies to finance paths too', async () => {
    localStorage.removeItem('auth_token');
    await expect(api.get('/finance/summary')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
});

describe('dev write guard', () => {
  function liveDev() {
    vi.spyOn(config, 'isDevelopment').mockReturnValue(true);
    config.stays.dataSource = 'api';
    config.stays.allowLiveWrites = false;
  }

  it('blocks a POST from a dev build against the live API before it is sent', async () => {
    liveDev();
    const hits = sequence('post', BOOKINGS, [ok]);
    await expect(api.post('/stays/supplier/bookings', {})).rejects.toMatchObject({
      code: LIVE_WRITE_BLOCKED,
    });
    expect(hits.count).toBe(0);
    expect(toast.warning).toHaveBeenCalledWith(
      'Writes to the live API are disabled in development',
      expect.objectContaining({ id: LIVE_WRITE_BLOCKED }),
    );
  });

  it('blocks PATCH and DELETE but lets reads through', () => {
    liveDev();
    expect(isLiveWriteBlocked({ method: 'patch', url: '/travioghana/supplier/stays/properties/p1' })).toBe(true);
    expect(isLiveWriteBlocked({ method: 'delete', url: '/travioghana/supplier/stays/offers/o1' })).toBe(true);
    expect(isLiveWriteBlocked({ method: 'get', url: '/travioghana/supplier/stays/dashboard' })).toBe(false);
  });

  it('always allows sign-in, refresh and sign-out', async () => {
    liveDev();
    expect(isLiveWriteBlocked({ method: 'post', url: '/auth/login' })).toBe(false);
    expect(isLiveWriteBlocked({ method: 'post', url: '/auth/logout' })).toBe(false);
    const hits = sequence('post', `${BASE}/auth/login`, [ok]);
    await api.post('/auth/login', { email: 'a', password: 'b' });
    expect(hits.count).toBe(1);
  });

  it('is disabled by VITE_ALLOW_LIVE_WRITES', () => {
    liveDev();
    config.stays.allowLiveWrites = true;
    expect(isLiveWriteBlocked({ method: 'post', url: '/travioghana/supplier/stays/bookings' })).toBe(false);
  });

  it('is inactive in production builds and in mock mode', () => {
    vi.spyOn(config, 'isDevelopment').mockReturnValue(false);
    config.stays.dataSource = 'api';
    expect(isLiveWriteBlocked({ method: 'post', url: '/travioghana/supplier/stays/bookings' })).toBe(false);

    vi.spyOn(config, 'isDevelopment').mockReturnValue(true);
    config.stays.dataSource = 'mock';
    expect(isLiveWriteBlocked({ method: 'post', url: '/travioghana/supplier/stays/bookings' })).toBe(false);
  });
});
