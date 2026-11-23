import axios, { type AxiosError } from 'axios';
import { toast } from 'sonner';
import config from '@/config';

export const ErrorType = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  FORBIDDEN: 'FORBIDDEN_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType];

/** Raised by the dev write guard in `lib/axios` — the request never left the browser. */
export const LIVE_WRITE_BLOCKED = 'LIVE_WRITE_BLOCKED';
export const LIVE_WRITE_BLOCKED_MESSAGE = 'Writes to the live API are disabled in development';

const errorMessages: Record<ErrorTypeValue, string> = {
  [ErrorType.NETWORK]: 'Network error. Please check your internet connection.',
  [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorType.AUTH]: 'Your session has expired. Please sign in again.',
  [ErrorType.VALIDATION]: 'Some details need checking. Please review your input.',
  [ErrorType.SERVER]: 'Something went wrong on our side. Please try again shortly.',
  [ErrorType.NOT_FOUND]: "We couldn't find what you were looking for.",
  [ErrorType.FORBIDDEN]: "You don't have permission to do that.",
  [ErrorType.UNKNOWN]: 'An unexpected error occurred.',
};

type ApiErrorBody = { message?: unknown; error?: unknown };

/** Anything a rejected request can produce: AxiosError, a plain Error, or unknown. */
type ErrorLike = Partial<AxiosError<ApiErrorBody>> & { code?: string; message?: string };

function asErrorLike(error: unknown): ErrorLike {
  return (error && typeof error === 'object' ? error : {}) as ErrorLike;
}

export function getErrorType(error: unknown): ErrorTypeValue {
  const err = asErrorLike(error);
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return ErrorType.TIMEOUT;
    return ErrorType.NETWORK;
  }

  const status = err.response.status;
  if (status === 401) return ErrorType.AUTH;
  if (status === 400 || status === 422) return ErrorType.VALIDATION;
  if (status === 403) return ErrorType.FORBIDDEN;
  if (status === 404) return ErrorType.NOT_FOUND;
  if (status >= 500) return ErrorType.SERVER;
  return ErrorType.UNKNOWN;
}

/**
 * A message fit to show a user: the server's own message when it sent one,
 * otherwise the friendly text for the error type. Axios's generic
 * "Request failed with status code 500" / "Network Error" never reach the UI.
 */
export function getErrorMessage(error: unknown): string {
  const err = asErrorLike(error);
  if (err.code === LIVE_WRITE_BLOCKED) return LIVE_WRITE_BLOCKED_MESSAGE;

  const body = err.response?.data;
  const serverMessage = [body?.message, body?.error].find(
    (value): value is string => typeof value === 'string' && value.trim() !== '',
  );
  return serverMessage || errorMessages[getErrorType(error)];
}

/**
 * True when a Stays / finance supplier endpoint answered 404 or 501: the
 * feature has not shipped on the backend for this account yet. Pages render
 * a calm "not available yet" state instead of an error.
 */
const NOT_AVAILABLE_PATHS = [
  /^\/stays\/supplier(\/|$)/,
  /^\/travioghana\/supplier\/stays(\/|$)/,
  /^\/finance\//,
  /^\/travioghana\/supplier\/finance(\/|$)/,
];

export function isNotAvailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status !== 404 && status !== 501) return false;
  const path = String(error.config?.url || '').split('?')[0];
  return NOT_AVAILABLE_PATHS.some((pattern) => pattern.test(path));
}

// Error toasts must never stack: an outage fails every background refetch, and
// each failure would otherwise pop its own toast. Same-message toasts are
// suppressed within the window.
const ERROR_TOAST_DEDUPE_MS = 20000;
let lastErrorToast: { message: string | null; at: number } = { message: null, at: 0 };

function shouldShowErrorToast(message: string) {
  const now = Date.now();
  if (lastErrorToast.message === message && now - lastErrorToast.at < ERROR_TOAST_DEDUPE_MS) {
    return false;
  }
  lastErrorToast = { message, at: now };
  return true;
}

/** Test hook: forget the last toast so dedupe does not leak across tests. */
export function resetErrorToastDedupe() {
  lastErrorToast = { message: null, at: 0 };
}

export type HandledError = { type: ErrorTypeValue; message: string; originalError: unknown };

/** Show a toast (deduped, never for offline errors) and report to monitoring. */
export function handleApiError(error: unknown, customMessage?: string): HandledError {
  const type = getErrorType(error);
  const message = customMessage || getErrorMessage(error);

  if (config.isDevelopment()) {
    console.error('API Error:', { type, message, error });
  }

  if (type !== ErrorType.NETWORK && shouldShowErrorToast(message)) {
    toast.error(message, { duration: 5000 });
  }

  logError(error, { type, message });
  return { type, message, originalError: error };
}

export type ErrorContext = Record<string, unknown>;
type ErrorReporter = (error: unknown, context: ErrorContext) => void;

let reporter: ErrorReporter | null = null;

/**
 * Monitoring hook. Nothing is wired yet — call `setErrorReporter` from
 * `main.tsx` once a service (Sentry, …) is chosen. Until then this is a no-op.
 */
export function setErrorReporter(next: ErrorReporter | null) {
  reporter = next;
}

export function logError(error: unknown, context: ErrorContext = {}) {
  reporter?.(error, context);
}

/** Network drops, timeouts and 5xx are worth retrying; everything else is final. */
export function isRetryableError(error: unknown): boolean {
  const type = getErrorType(error);
  return type === ErrorType.NETWORK || type === ErrorType.TIMEOUT || type === ErrorType.SERVER;
}

/**
 * Report unhandled errors to monitoring. The browser's own logging is left
 * alone: suppressing it (`preventDefault`) used to hide real bugs.
 */
export function setupGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'unhandledRejection' });
  });

  window.addEventListener('error', (event) => {
    logError(event.error, { type: 'globalError' });
  });
}
