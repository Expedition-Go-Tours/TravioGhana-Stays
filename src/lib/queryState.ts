import { isNotAvailable } from "./errorHandler";

/**
 * One status per query, with "unavailable" split out of "error": a Stays or
 * finance endpoint that answers 404/501 has not shipped for this account yet,
 * which deserves a calm notice — not a red error and not a misleading empty
 * list.
 */
export type QueryStatus = "loading" | "error" | "unavailable" | "success";

type QueryLike = { isLoading?: boolean; isPending?: boolean; isError?: boolean; error?: unknown };

export function queryStatus(query: QueryLike): QueryStatus {
  if (query.isError) return isNotAvailable(query.error) ? "unavailable" : "error";
  if (query.isLoading || query.isPending) return "loading";
  return "success";
}

/**
 * TanStack Query retry policy: one retry for ordinary failures, none for an
 * endpoint that does not exist (retrying a 404 only delays the notice).
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isNotAvailable(error)) return false;
  return failureCount < 1;
}
