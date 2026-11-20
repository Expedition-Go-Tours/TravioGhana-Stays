import "axios";

/**
 * Options the app's axios wrapper understands on top of Axios's own config.
 *
 * `lib/axios` reads both flags in its interceptors:
 *  - `skipGlobalErrorHandler` — the caller renders its own error state
 *    (used by pages that show inline retry UI);
 *  - `skipRetry` — fail fast, e.g. sign-in, where retrying a bad password
 *    just makes the user wait.
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
    skipRetry?: boolean;
    skipAuthGuard?: boolean;
  }
}
