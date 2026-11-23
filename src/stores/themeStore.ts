import { create } from "zustand";

/**
 * Light / dark / system theme.
 *
 * The choice is stored per browser under `stays-theme`. `public/theme-init.js`
 * reads the same key before first paint and applies the class, so this store
 * only has to keep it in sync afterwards — keep the two in step.
 *
 * "system" follows the OS setting live (prefers-color-scheme).
 */
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "stays-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(DARK_QUERY).matches
    : false;
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean = systemPrefersDark()): ResolvedTheme {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

type ThemeState = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Re-read the OS preference (called by the media-query listener). */
  syncSystem: () => void;
};

export const useThemeStore = create<ThemeState>()((set, get) => {
  const mode = readStoredMode();
  return {
    mode,
    resolved: resolveTheme(mode),
    setMode: (next) => {
      try {
        if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
        else localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* Storage blocked: the choice lasts for this session only. */
      }
      const resolved = resolveTheme(next);
      applyTheme(resolved);
      set({ mode: next, resolved });
    },
    syncSystem: () => {
      const { mode: current } = get();
      if (current !== "system") return;
      const resolved = resolveTheme("system");
      applyTheme(resolved);
      set({ resolved });
    },
  };
});

let listening = false;

/**
 * Apply the stored theme and follow OS changes while in "system" mode.
 * Call once at startup (main.tsx).
 */
export function initTheme() {
  applyTheme(useThemeStore.getState().resolved);
  if (listening || typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  const query = window.matchMedia(DARK_QUERY);
  const onChange = () => useThemeStore.getState().syncSystem();
  if (typeof query.addEventListener === "function") query.addEventListener("change", onChange);
  else query.addListener?.(onChange);
  listening = true;
}
