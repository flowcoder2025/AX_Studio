// Retry utility with exponential backoff

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries) break;

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);

      onRetry?.(attempt + 1, error);

      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }

  throw lastError!;
}

// Timeout wrapper
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Combined retry + timeout
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retryOpts?: RetryOptions,
  timeoutMs = 60000
): Promise<T> {
  return withRetry(() => withTimeout(fn, timeoutMs), retryOpts);
}
