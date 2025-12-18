import { type PtyHandle } from '@daytonaio/sdk'

/**
 * Generates a unique marker string for detecting command completion.
 * Uses timestamp and random string to ensure uniqueness.
 */
function generateMarker(): string {
  return `__CMD_END_${Date.now()}_${Math.random().toString(36).substring(7)}__`
}

/**
 * Executes a command with a marker to detect completion.
 * The marker is echoed after the command (or if the command fails) to signal completion.
 *
 * @param ptyHandle - The PTY handle to send input to
 * @param command - The command to execute
 * @returns The marker string that will be used to detect completion
 */
export async function executeWithMarker(
  ptyHandle: PtyHandle,
  command: string,
): Promise<string> {
  const marker = generateMarker()

  // Send command with end marker to detect completion
  // Use || echo to ensure marker is always printed even if command fails
  await ptyHandle.sendInput(
    `${command}; echo "${marker}" || echo "${marker}"\n`,
  )

  return marker
}
