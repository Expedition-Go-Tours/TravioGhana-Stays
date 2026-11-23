import { useSyncExternalStore } from "react";

/** Tailwind's breakpoints, for code that has to branch on layout. */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

function subscribe(query: string, onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(query);
  if (typeof list.addEventListener === "function") {
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }
  list.addListener?.(onChange);
  return () => list.removeListener?.(onChange);
}

/**
 * True while `query` matches. Without matchMedia (very old browsers) it
 * returns `fallback`.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : fallback),
    () => fallback,
  );
}

/** True at or above a Tailwind breakpoint, e.g. `useBreakpoint("md")`. */
export function useBreakpoint(name: keyof typeof BREAKPOINTS): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[name]}px)`, true);
}
