import { afterEach, describe, expect, it } from 'vitest';
import { resolveDataSource } from '@/config/dataSource';
import { assertSafeDataSource, installMockSession } from '../mockSession';
import { useAuthStore } from '@/stores/authStore';

describe('resolveDataSource', () => {
  const dev = { isProductionBuild: false, allowMockInProd: false };
  const prod = { isProductionBuild: true, allowMockInProd: false };

  it('accepts exactly "mock" and "api" (case and whitespace tolerant)', () => {
    expect(resolveDataSource({ ...dev, value: 'mock' })).toEqual({ source: 'mock', error: null });
    expect(resolveDataSource({ ...dev, value: 'api' })).toEqual({ source: 'api', error: null });
    expect(resolveDataSource({ ...prod, value: ' API ' })).toEqual({ source: 'api', error: null });
  });

  it('treats a typo as a configuration error and never as mock mode', () => {
    for (const value of ['apl', 'live', 'mocked', '', undefined, null, 1]) {
      const result = resolveDataSource({ ...dev, value });
      expect(result.source, String(value)).toBe('api');
      expect(result.error, String(value)).toMatch(/VITE_STAYS_DATA_SOURCE must be/);
    }
  });

  it('refuses mock mode in a production build unless explicitly allowed', () => {
    const refused = resolveDataSource({ ...prod, value: 'mock' });
    expect(refused.source).toBe('api');
    expect(refused.error).toMatch(/VITE_ALLOW_MOCK_IN_PROD/);

    expect(resolveDataSource({ value: 'mock', isProductionBuild: true, allowMockInProd: true })).toEqual({
      source: 'mock',
      error: null,
    });
  });
});

describe('assertSafeDataSource', () => {
  it('throws the configuration error so main.tsx never boots unsafely', () => {
    expect(() => assertSafeDataSource('bad config')).toThrow('bad config');
    expect(() => assertSafeDataSource(null)).not.toThrow();
  });
});

describe('installMockSession', () => {
  afterEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, supplierProfile: null });
  });

  it('seeds a demo owner session when enabled', () => {
    installMockSession(true);
    expect(localStorage.getItem('auth_token')).toBe('mock-session-token');
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, token: 'mock-session-token' });
  });

  it('does nothing when disabled', () => {
    installMockSession(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
