import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keep the active settings tab in the URL (`?tab=payouts`).
 *
 * Deep links from the sidebar, the search palette and the team rows all land
 * here, so the URL is the source of truth. Replace rather than push: switching
 * tabs should not fill the back button with every section the user glanced at.
 */
export function useTabParam(defaultTab: string) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || defaultTab;

  const setTab = useCallback(
    (next: string) => {
      const nextParams = new URLSearchParams(params);
      nextParams.set("tab", next);
      setParams(nextParams, { replace: true });
    },
    [params, setParams],
  );

  return [tab, setTab] as const;
}
