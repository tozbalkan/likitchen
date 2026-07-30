import { ToolValidationError } from '../errors/tool-execution-error';

export interface RetryDecisionPolicy {
  shouldRetry(
    error: unknown,
    attempt: number,
    context?: Readonly<Record<string, unknown>>,
  ): boolean;
}

export class TransientErrorRetryDecisionPolicy implements RetryDecisionPolicy {
  shouldRetry(
    error: unknown,
    attempt: number,
    _context?: Readonly<Record<string, unknown>>,
  ): boolean {
    if (!error || attempt < 1) {
      return false;
    }

    // 1. Explicit non-retryable errors
    if (error instanceof ToolValidationError) {
      return false;
    }

    const errObj = error as {
      name?: string;
      code?: string;
      status?: number;
      statusCode?: number;
      message?: string;
    };

    // 2. Check HTTP status code if present
    const status = errObj.status ?? errObj.statusCode;
    if (status !== undefined) {
      // Retryable HTTP statuses: 429 (Rate Limit), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
      if (
        status === 429 ||
        status === 502 ||
        status === 503 ||
        status === 504
      ) {
        return true;
      }
      // Non-retryable HTTP statuses: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // 3. Transient error codes (ECONNRESET, ETIMEDOUT, ENOTFOUND)
    const code = errObj.code;
    if (
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'FETCH_ERROR'
    ) {
      return true;
    }

    // 4. Fallback: check error name or message for network/timeout keywords
    const msg = (errObj.message ?? '').toLowerCase();
    if (
      msg.includes('timeout') ||
      msg.includes('connection reset') ||
      msg.includes('network error') ||
      msg.includes('fetch failed')
    ) {
      return true;
    }

    return false;
  }
}
