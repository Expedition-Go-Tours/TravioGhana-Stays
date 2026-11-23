import "axios";

/**
 * Options the app's axios wrapper understands on top of Axios's own config.
 *
 * Caller-facing flags:
 *  - `skipGlobalErrorHandler` — the caller renders its own error state
 *    (used by pages that show inline retry UI);
 *  - `skipRetry` — fail fast, e.g. sign-in, where retrying a bad password
 *    just makes the user wait;
 *  - `skipAuthGuard` — send without a token (public endpoints).
 *
 * Internal bookkeeping (set by `lib/axios`, never by callers):
 *  - `_authRefreshed` — a 401 already triggered one token refresh;
 *  - `_retryCount` — automatic retries spent on network / 5xx failures.
 *    Kept separate so a request retried after a 5xx can still refresh on 401.
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
    skipRetry?: boolean;
    skipAuthGuard?: boolean;
    _authRefreshed?: boolean;
    _retryCount?: number;
  }
}
