/**
 * Waits for output stability by polling until no new output has arrived
 * for the specified duration.
 *
 * @param getLastOutputTime - Function that returns the last output time
 * @param stabilityMs - Milliseconds to wait with no new output (default: 300ms)
 * @param pollIntervalMs - Interval between polls (default: 50ms)
 */
export async function waitForStability(
  getLastOutputTime: () => number,
  stabilityMs = 300,
  pollIntervalMs = 50,
): Promise<void> {
  if (stabilityMs <= 0) {
    return
  }

  let lastCheckTime = getLastOutputTime()

  // Poll until we have stability (no new output for stabilityMs)
  while (Date.now() - lastCheckTime < stabilityMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    const currentOutputTime = getLastOutputTime()

    // If new output arrived, restart the stability timer
    if (currentOutputTime > lastCheckTime) {
      lastCheckTime = currentOutputTime
    }
  }
}
