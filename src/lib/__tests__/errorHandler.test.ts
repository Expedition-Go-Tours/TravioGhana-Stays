import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  ErrorType,
  getErrorMessage,
  getErrorType,
  handleApiError,
  isNotAvailable,
  isRetryableError,
  LIVE_WRITE_BLOCKED,
  logError,
  resetErrorToastDedupe,
  setErrorReporter,
} from '../errorHandler';

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function httpError(status: number, url = '/travioghana/supplier/stays/dashboard', data: unknown = {}) {
  const config = { url, headers: new AxiosHeaders() };
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  });
}

beforeEach(() => {
  resetErrorToastDedupe();
  toast.error.mockClear();
});

afterEach(() => setErrorReporter(null));

describe('getErrorType', () => {
  it('classifies by status, and timeouts / offline by code', () => {
    expect(getErrorType(httpError(401))).toBe(ErrorType.AUTH);
    expect(getErrorType(httpError(422))).toBe(ErrorType.VALIDATION);
    expect(getErrorType(httpError(403))).toBe(ErrorType.FORBIDDEN);
    expect(getErrorType(httpError(404))).toBe(ErrorType.NOT_FOUND);
    expect(getErrorType(httpError(503))).toBe(ErrorType.SERVER);
    expect(getErrorType(new AxiosError('timeout', 'ECONNABORTED'))).toBe(ErrorType.TIMEOUT);
    expect(getErrorType(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(ErrorType.NETWORK);
  });
});

describe('getErrorMessage', () => {
  it("prefers the server's own message", () => {
    expect(getErrorMessage(httpError(422, undefined, { message: 'Email already in use' }))).toBe(
      'Email already in use',
    );
    expect(getErrorMessage(httpError(400, undefined, { error: 'Bad dates' }))).toBe('Bad dates');
  });

  it("never shows Axios's generic text", () => {
    const message = getErrorMessage(httpError(500));
    expect(message).not.toMatch(/status code/i);
    expect(message).toMatch(/try again/i);
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).not.toBe('Network Error');
  });

  it('explains a blocked live write', () => {
    expect(getErrorMessage(new AxiosError('x', LIVE_WRITE_BLOCKED))).toMatch(/disabled in development/);
  });

  it('copes with non-errors', () => {
    expect(getErrorMessage(undefined)).toBeTypeOf('string');
    expect(getErrorMessage('oops')).toBeTypeOf('string');
  });
});

describe('isNotAvailable', () => {
  it('is true for 404 / 501 on stays and finance supplier paths', () => {
    expect(isNotAvailable(httpError(404))).toBe(true);
    expect(isNotAvailable(httpError(501, '/travioghana/supplier/stays/analytics/summary'))).toBe(true);
    expect(isNotAvailable(httpError(404, '/travioghana/supplier/finance/summary'))).toBe(true);
    expect(isNotAvailable(httpError(404, '/stays/supplier/rates'))).toBe(true);
  });

  it('is false for other statuses, other paths and non-axios errors', () => {
    expect(isNotAvailable(httpError(500))).toBe(false);
    expect(isNotAvailable(httpError(403))).toBe(false);
    expect(isNotAvailable(httpError(404, '/auth/me'))).toBe(false);
    expect(isNotAvailable(new Error('x'))).toBe(false);
  });
});

describe('handleApiError', () => {
  it('toasts once per message within the dedupe window', () => {
    handleApiError(httpError(500));
    handleApiError(httpError(500));
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('does not toast offline errors', () => {
    handleApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports to the monitoring hook when one is set', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);
    const error = httpError(500);
    handleApiError(error);
    expect(reporter).toHaveBeenCalledWith(error, expect.objectContaining({ type: ErrorType.SERVER }));
  });

  it('logError is a no-op without a reporter', () => {
    expect(() => logError(new Error('x'))).not.toThrow();
  });
});

describe('isRetryableError', () => {
  it('retries network, timeout and 5xx only', () => {
    expect(isRetryableError(httpError(502))).toBe(true);
    expect(isRetryableError(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true);
    expect(isRetryableError(httpError(400))).toBe(false);
    expect(isRetryableError(httpError(401))).toBe(false);
  });
});
