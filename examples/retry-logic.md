# Retry Logic with Exponential Backoff

**Task:** "Add retry logic with exponential backoff to our HTTP client calls. Retry up to 3 times with jitter on transient errors."

## Without Snip

```ts
abstract class RetryPolicy {
  abstract shouldRetry(error: Error, attempt: number): boolean;
  abstract getDelay(attempt: number): number;
}

class ExponentialBackoffPolicy extends RetryPolicy {
  constructor(
    private readonly maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly jitterMs: number,
    private readonly retryableErrors: string[]
  ) { super(); }

  shouldRetry(error: Error, attempt: number): boolean {
    return attempt < this.maxAttempts &&
      this.retryableErrors.some(code => error.message.includes(code));
  }

  getDelay(attempt: number): number {
    return this.baseDelayMs * Math.pow(2, attempt) + Math.random() * this.jitterMs;
  }
}

class RetryExecutor {
  constructor(private readonly policy: RetryPolicy) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (!this.policy.shouldRetry(lastError, attempt)) throw lastError;
        await new Promise(r => setTimeout(r, this.policy.getDelay(attempt)));
      }
    }
    throw lastError!;
  }
}

// Usage:
const policy = new ExponentialBackoffPolicy(3, 100, 50, ['ECONNRESET', 'ETIMEDOUT']);
const executor = new RetryExecutor(policy);
const result = await executor.execute(() => fetch(url));
```

Three classes, an abstract base, generic type parameters, dependency injection — for a loop and a sleep.

## With Snip

```ts
// snip: plain loop; upgrade to p-retry if per-attempt hooks or named policies needed
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await new Promise(r => setTimeout(r, 100 * 2 ** i + Math.random() * 50));
    }
  }
  throw new Error('unreachable');
}

// Usage:
const result = await withRetry(() => fetch(url));
```

**~120 lines → 12 lines.** The upgrade path is explicit: if you need per-attempt callbacks, named strategies, or a configurable error filter, `p-retry` is already idiomatic for this and won't surprise future maintainers. The abstract class hierarchy is not that — it's the same behavior with extra indirection.
