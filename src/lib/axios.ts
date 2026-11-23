import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import config from "@/config";
import {
  handleApiError,
  isRetryableError,
  LIVE_WRITE_BLOCKED,
  LIVE_WRITE_BLOCKED_MESSAGE,
} from "./errorHandler";
import { useAuthStore, getAuthToken } from "@/stores/authStore";
import { refreshAccessToken, isStaleSessionRequest } from "./tokenRefresh";

/**
 * Paths (after the Ghana rewrite below) that must carry a token. A request
 * to one of these without a token is cancelled locally with AUTH_REQUIRED
 * instead of being sent and bounced with a 401.
 */
const AUTH_REQUIRED_PREFIXES = [
  "/suppliers",
  "/tours/supplier",
  "/travioghana/supplier",
  "/stays/supplier",
  "/finance",
  "/bookings",
  "/notifications",
  "/admin",
  "/reviews",
  "/refund-claims",
  "/payout",
];

/** Automatic retries are only safe for methods that cannot change state. */
const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);

/** Backoff between automatic retries: base × 2^(attempt − 1). Mutable for tests. */
export const retryPolicy = { baseDelayMs: 1000 };

const api = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
});

// Supplier paths live under the Ghana namespace on the shared backend, e.g.
// /stays/supplier/* → /travioghana/supplier/stays/*. Auth endpoints stay put.
const GHANA_SUPPLIER_REWRITES: [RegExp, string][] = [
  [/^\/suppliers\/dashboard/, "/travioghana/supplier/dashboard"],
  [/^\/suppliers\/monthly-revenue/, "/travioghana/supplier/monthly-revenue"],
  [/^\/tours\/supplier\/my-tours/, "/travioghana/supplier/tours"],
  [/^\/bookings\/supplier\/bookings/, "/travioghana/supplier/bookings"],
  [/^\/bookings\/supplier\/pickup-planner/, "/travioghana/supplier/pickup-planner"],
  [/^\/reviews\/supplier\/reviews/, "/travioghana/supplier/reviews"],
  [/^\/suppliers\/settings/, "/travioghana/supplier/settings"],
  [/^\/suppliers\/special-offers/, "/travioghana/supplier/special-offers"],
  [/^\/suppliers\/cancellation/, "/travioghana/supplier/cancellation"],
  [/^\/suppliers\/products\/list/, "/travioghana/supplier/products/list"],
  [/^\/finance\//, "/travioghana/supplier/finance/"],
  [/^\/payouts\/me/, "/travioghana/supplier/payouts"],
  [/^\/payout-methods\/me/, "/travioghana/supplier/payout-methods"],
  [/^\/notifications/, "/travioghana/supplier/notifications"],
  [/^\/stays\/supplier/, "/travioghana/supplier/stays"],
];

export function rewriteSupplierPath(url: string): string {
  for (const [pattern, replacement] of GHANA_SUPPLIER_REWRITES) {
    if (pattern.test(url)) return url.replace(pattern, replacement);
  }
  return url;
}

const pathOf = (url: string | undefined) => String(url || "").split("?")[0];

function getRequestAuthorization(headers: AxiosRequestConfig["headers"] | undefined): string | null {
  if (!headers) return null;
  if (headers instanceof AxiosHeaders) {
    const value = headers.get("Authorization") || headers.get("authorization");
    return value ? String(value) : null;
  }
  const plain = headers as Record<string, unknown>;
  const value = plain.Authorization || plain.authorization;
  return value ? String(value) : null;
}

function setRequestAuthorization(requestConfig: InternalAxiosRequestConfig, value: string) {
  requestConfig.headers = AxiosHeaders.from(requestConfig.headers ?? {});
  requestConfig.headers.set("Authorization", value);
}

function isAuthEndpoint(url: string | undefined) {
  const path = pathOf(url);
  return ["/auth/login", "/auth/refresh", "/auth/logout"].some(
    (endpoint) => path === endpoint || path.endsWith(endpoint),
  );
}

function requiresAuth(requestConfig: InternalAxiosRequestConfig) {
  if (requestConfig.skipAuthGuard) return false;
  const path = pathOf(requestConfig.url);
  if (isAuthEndpoint(path)) return false;
  if (AUTH_REQUIRED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  const method = (requestConfig.method || "get").toLowerCase();
  return /^\/tours(\/|$)/.test(path) && method !== "get";
}

/**
 * Dev write guard. A development build pointed at the live API
 * (`VITE_STAYS_DATA_SOURCE=api`) talks to production, so it only sends reads.
 * Sign-in, refresh and sign-out (`/auth/*`) are always allowed. Opt in with
 * `VITE_ALLOW_LIVE_WRITES=true`. Production builds are never affected.
 */
export function isLiveWriteBlocked(requestConfig: Pick<AxiosRequestConfig, "method" | "url">) {
  if (!config.isDevelopment()) return false;
  if (config.stays.dataSource !== "api") return false;
  if (config.stays.allowLiveWrites) return false;
  const method = (requestConfig.method || "get").toLowerCase();
  if (IDEMPOTENT_METHODS.has(method)) return false;
  const path = pathOf(requestConfig.url);
  return !(path.startsWith("/auth/") || path.includes("/auth/"));
}

function localError(code: string, message: string, requestConfig: InternalAxiosRequestConfig) {
  return new AxiosError(message, code, requestConfig);
}

function isAuthPagePath() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === "/login" || path.startsWith("/login/") || path.startsWith("/auth/");
}

/**
 * Unrecoverable 401 — clear the session and send the user back to /login.
 * The return URL is only captured when we're NOT already on the login/auth
 * pages, otherwise the post-login redirect can point back at /login and loop.
 */
function performForcedLogout() {
  if (typeof window !== "undefined" && !isAuthPagePath()) {
    localStorage.setItem("auth_return_url", window.location.pathname + window.location.search);
  }
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("refresh_token");
  useAuthStore.getState().setUnauthenticated();
  if (typeof window !== "undefined" && !isAuthPagePath()) {
    window.location.href = "/login";
  }
}

/**
 * One ordered request pipeline. (Axios runs separately registered request
 * interceptors in reverse order, which used to run the auth guard before the
 * path rewrite.) Order: rewrite → write guard → attach token → auth guard.
 */
api.interceptors.request.use((requestConfig) => {
  requestConfig.url = rewriteSupplierPath(requestConfig.url || "");

  if (isLiveWriteBlocked(requestConfig)) {
    return Promise.reject(localError(LIVE_WRITE_BLOCKED, LIVE_WRITE_BLOCKED_MESSAGE, requestConfig));
  }

  const token = getAuthToken();
  if (token && !getRequestAuthorization(requestConfig.headers)) {
    setRequestAuthorization(requestConfig, `Bearer ${token}`);
  }

  if (requiresAuth(requestConfig) && !getRequestAuthorization(requestConfig.headers)) {
    const error = new axios.CanceledError("Authentication required");
    error.code = "AUTH_REQUIRED";
    return Promise.reject(error);
  }

  return requestConfig;
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isCancel(error) || error.code === "AUTH_REQUIRED") {
      return Promise.reject(error);
    }

    if (error.code === LIVE_WRITE_BLOCKED) {
      // Fixed id: sonner keeps one toast however many writes a page attempts.
      toast.warning(LIVE_WRITE_BLOCKED_MESSAGE, {
        id: LIVE_WRITE_BLOCKED,
        description: "Set VITE_ALLOW_LIVE_WRITES=true to send it anyway.",
      });
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const status = error.response?.status;

    // 401 — refresh the access token once, then replay the request.
    if (status === 401 && originalRequest && !originalRequest._authRefreshed) {
      // Auth endpoints 401 on their own merit (e.g. a wrong password).
      if (isAuthEndpoint(originalRequest.url)) return Promise.reject(error);

      // A leftover request from a previous session: never tear down a fresh one.
      const sentAuthorization = getRequestAuthorization(originalRequest.headers);
      if (isStaleSessionRequest(sentAuthorization)) return Promise.reject(error);

      originalRequest._authRefreshed = true;
      try {
        const data = await refreshAccessToken();
        setRequestAuthorization(originalRequest, `Bearer ${data.accessToken}`);
        return api(originalRequest);
      } catch {
        if (isStaleSessionRequest(sentAuthorization)) return Promise.reject(error);
        performForcedLogout();
        return Promise.reject(error);
      }
    }

    // Network drop / timeout / 5xx — retry reads only. Each retry re-enters
    // this pipeline, so only the final failure reaches the error handler.
    const method = (originalRequest?.method || "get").toLowerCase();
    const attempts = originalRequest?._retryCount ?? 0;
    if (
      originalRequest &&
      !originalRequest.skipRetry &&
      IDEMPOTENT_METHODS.has(method) &&
      isRetryableError(error) &&
      attempts < config.api.retryAttempts
    ) {
      originalRequest._retryCount = attempts + 1;
      await wait(retryPolicy.baseDelayMs * 2 ** attempts);
      return api(originalRequest);
    }

    if (!originalRequest?.skipGlobalErrorHandler) {
      handleApiError(error);
    }

    if (
      status === 401 &&
      !isAuthEndpoint(originalRequest?.url) &&
      !isStaleSessionRequest(getRequestAuthorization(originalRequest?.headers)) &&
      typeof window !== "undefined" &&
      !isAuthPagePath()
    ) {
      performForcedLogout();
    }

    return Promise.reject(error);
  },
);

export default api;
