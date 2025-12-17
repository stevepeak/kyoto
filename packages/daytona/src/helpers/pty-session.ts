import { type PtyHandle, type Sandbox } from '@daytonaio/sdk'

/**
 * Asciicast v2 event format: [time, type, data]
 * - time: seconds since recording start
 * - type: 'o' for output, 'i' for input
 * - data: the text content
 */
type AsciicastEvent = [number, 'o' | 'i', string]

/**
 * Asciicast v2 format header
 */
type AsciicastHeader = {
  version: 2
  width: number
  height: number
  timestamp: number
  title?: string
  env?: Record<string, string>
}

/**
 * Complete asciicast recording data
 */
export type AsciicastRecording = {
  header: AsciicastHeader
  events: AsciicastEvent[]
}

type PtySessionConfig = {
  /** The Daytona sandbox instance */
  sandbox: Sandbox
  /** Unique session identifier */
  sessionId: string
  /** Terminal width in columns (default: 120) */
  cols?: number
  /** Terminal height in rows (default: 40) */
  rows?: number
  /** Working directory for the PTY session */
  cwd?: string
  /** Optional callback for real-time output */
  onOutput?: (text: string) => void
}

/**
 * Manages a recorded PTY session in a Daytona sandbox.
 * All terminal output is captured in asciicast v2 format for playback.
 */
export type RecordedPtySession = {
  /** The underlying PTY handle */
  ptyHandle: PtyHandle
  /**
   * Execute a command and wait for its completion.
   * Uses a marker to detect when the command has finished.
   */
  executeCommand: (command: string) => Promise<string>
  /**
   * Wait for output containing the specified marker.
   * Returns all output captured before the marker.
   */
  waitForOutput: (marker: string) => Promise<string>
  /** Get the complete asciicast recording */
  getRecording: () => AsciicastRecording
  /** Close the PTY session and clean up */
  close: () => Promise<void>
}

/**
 * Creates a recorded PTY session in a Daytona sandbox.
 * All commands executed through this session will be captured
 * in asciicast v2 format for later playback.
 */
export async function createRecordedPtySession(
  config: PtySessionConfig,
): Promise<RecordedPtySession> {
  const { sandbox, sessionId, cols = 120, rows = 40, cwd, onOutput } = config

  const startTime = Date.now()
  const events: AsciicastEvent[] = []
  let outputBuffer = ''

  // Pending promise resolvers for waitForOutput
  const pendingResolvers: {
    marker: string
    resolve: (output: string) => void
  }[] = []

  // Create the PTY session
  const ptyHandle = await sandbox.process.createPty({
    id: sessionId,
    cols,
    rows,
    cwd,
    onData: (data) => {
      const text = new TextDecoder().decode(data)

      // Record the output event
      const elapsed = (Date.now() - startTime) / 1000
      events.push([elapsed, 'o', text])

      // Accumulate to buffer
      outputBuffer += text

      // Notify callback
      onOutput?.(text)

      // Check if any pending resolvers can be satisfied
      for (let i = pendingResolvers.length - 1; i >= 0; i--) {
        const pending = pendingResolvers[i]
        if (pending && outputBuffer.includes(pending.marker)) {
          // Extract output before the marker
          const markerIndex = outputBuffer.indexOf(pending.marker)
          const output = outputBuffer.substring(0, markerIndex)

          // Remove from pending
          pendingResolvers.splice(i, 1)

          // Resolve the promise
          pending.resolve(output.trim())
        }
      }
    },
  })

  // Wait for the connection to be established
  await ptyHandle.waitForConnection()

  // Change to the working directory if specified
  if (cwd) {
    await ptyHandle.sendInput(`cd ${cwd}\n`)
    // Wait a bit for the cd to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    // Clear the output buffer after initial setup
    outputBuffer = ''
  }

  async function waitForOutput(marker: string): Promise<string> {
    // Check if marker is already in buffer
    if (outputBuffer.includes(marker)) {
      const markerIndex = outputBuffer.indexOf(marker)
      const output = outputBuffer.substring(0, markerIndex)
      // Clear the buffer up to and including the marker
      outputBuffer = outputBuffer.substring(markerIndex + marker.length)
      return output.trim()
    }

    // Wait for the marker to appear
    return new Promise((resolve) => {
      pendingResolvers.push({ marker, resolve })
    })
  }

  async function executeCommand(command: string): Promise<string> {
    const marker = `__CMD_END_${Date.now()}_${Math.random().toString(36).substring(7)}__`

    // Clear buffer before command
    outputBuffer = ''

    // Record the input event
    const elapsed = (Date.now() - startTime) / 1000
    events.push([elapsed, 'i', command + '\n'])

    // Send the command with an echo marker to detect completion
    await ptyHandle.sendInput(`${command}; echo "${marker}"\n`)

    // Wait for the marker in output
    const output = await waitForOutput(marker)

    return output
  }

  function getRecording(): AsciicastRecording {
    return {
      header: {
        version: 2,
        width: cols,
        height: rows,
        timestamp: Math.floor(startTime / 1000),
        title: `Kyoto VM Session - ${sessionId}`,
        env: {
          TERM: 'xterm-256color',
          SHELL: '/bin/bash',
        },
      },
      events,
    }
  }

  async function close(): Promise<void> {
    await ptyHandle.disconnect()
  }

  return {
    ptyHandle,
    executeCommand,
    waitForOutput,
    getRecording,
    close,
  }
}

/**
 * Serialize an asciicast recording to the v2 format string.
 * Each line is a JSON object (header first, then events).
 */
export function serializeAsciicast(recording: AsciicastRecording): string {
  const lines = [JSON.stringify(recording.header)]

  for (const event of recording.events) {
    lines.push(JSON.stringify(event))
  }

  return lines.join('\n')
}
