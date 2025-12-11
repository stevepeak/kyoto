/**
 * Wraps a promise with a timeout. If the promise doesn't resolve or reject
 * within the specified timeout, it rejects with a timeout error.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Optional custom error message
 * @returns A promise that rejects if the timeout is exceeded
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            errorMessage ??
              `Operation timed out after ${timeoutMs}ms (${timeoutMs / 1000}s)`,
          ),
        )
      }, timeoutMs)
    }),
  ])
}
