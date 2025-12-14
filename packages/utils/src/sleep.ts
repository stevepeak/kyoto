/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the specified delay
 */
export function sleep(args: { ms: number }): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, args.ms)
  })
}
