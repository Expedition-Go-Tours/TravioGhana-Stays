import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A controllable prefers-color-scheme media query. */
function mockSystemTheme(initialDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn().mockReturnValue(query) as unknown as typeof window.matchMedia;
  return {
    setDark(dark: boolean) {
      query.matches = dark;
      listeners.forEach((fn) => fn());
    },
  };
}

async function loadStore() {
  vi.resetModules();
  return import('../themeStore');
}

const html = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  html().classList.remove('dark');
  html().style.colorScheme = '';
});

afterEach(() => vi.restoreAllMocks());

describe('themeStore', () => {
  it('defaults to system and follows the OS preference', async () => {
    mockSystemTheme(true);
    const { useThemeStore, initTheme } = await loadStore();
    initTheme();
    expect(useThemeStore.getState()).toMatchObject({ mode: 'system', resolved: 'dark' });
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().style.colorScheme).toBe('dark');
  });

  it('persists an explicit choice and applies it immediately', async () => {
    mockSystemTheme(false);
    const { useThemeStore, THEME_STORAGE_KEY } = await loadStore();
    useThemeStore.getState().setMode('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(html().classList.contains('dark')).toBe(true);

    useThemeStore.getState().setMode('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('restores the saved choice on the next load', async () => {
    mockSystemTheme(false);
    localStorage.setItem('stays-theme', 'dark');
    const { useThemeStore } = await loadStore();
    expect(useThemeStore.getState()).toMatchObject({ mode: 'dark', resolved: 'dark' });
  });

  it('choosing system clears the saved value', async () => {
    mockSystemTheme(false);
    localStorage.setItem('stays-theme', 'dark');
    const { useThemeStore } = await loadStore();
    useThemeStore.getState().setMode('system');
    expect(localStorage.getItem('stays-theme')).toBeNull();
    expect(useThemeStore.getState().resolved).toBe('light');
  });

  it('tracks OS changes live in system mode, and ignores them otherwise', async () => {
    const system = mockSystemTheme(false);
    const { useThemeStore, initTheme } = await loadStore();
    initTheme();

    system.setDark(true);
    expect(useThemeStore.getState().resolved).toBe('dark');
    expect(html().classList.contains('dark')).toBe(true);

    useThemeStore.getState().setMode('light');
    system.setDark(true);
    expect(useThemeStore.getState().resolved).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('ignores an unknown stored value', async () => {
    mockSystemTheme(false);
    localStorage.setItem('stays-theme', 'sepia');
    const { useThemeStore } = await loadStore();
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
