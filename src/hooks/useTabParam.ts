import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * A tab (or any single choice) kept in the URL, e.g. `?tab=payouts`, so a
 * reload, a shared link or the back button lands on the same view.
 *
 * - An unknown or forbidden value in the URL resolves to `fallback`.
 * - Choosing `fallback` removes the parameter (clean URLs).
 * - Other query parameters are preserved.
 */
export function useTabParam<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = (raw && (allowed as readonly string[]).includes(raw) ? raw : fallback) as T;

  const setValue = useCallback(
    (next: T) => {
      setParams((current) => {
        const updated = new URLSearchParams(current);
        if (next === fallback) updated.delete(key);
        else updated.set(key, next);
        return updated;
      });
    },
    [fallback, key, setParams],
  );

  return [value, setValue];
}
