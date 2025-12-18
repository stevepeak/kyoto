import { type PtyHandle, type Sandbox } from '@daytonaio/sdk'

import { waitForStability } from '../utils/stability-utils'

/**
 * UUID prompt pattern: matches UUID followed by % (e.g., "79692d63-1269-4cd9-b7b7-4059230e06ee%")
 * This pattern indicates the terminal is ready for the next command.
 */
const UUID_PROMPT_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}%/i

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
   * Waits for the UUID% prompt pattern to appear, indicating the terminal is ready.
   */
  executeCommand: (command: string) => Promise<string>
  /**
   * Wait for the UUID% prompt pattern to appear.
   * Returns all output captured before the prompt.
   */
  waitForPrompt: () => Promise<string>
  /** Get the complete asciicast recording */
  getRecording: () => AsciicastRecording
  /** Close the PTY session and clean up */
  close: () => Promise<void>
}

/**
 * Manages the state and handlers for a recorded PTY session.
 * Separates concerns: recording, buffering, and marker resolution.
 */
class PtySessionState {
  private readonly startTime: number
  private readonly events: AsciicastEvent[] = []
  private outputBuffer = ''
  private lastOutputTime: number
  private readonly pendingResolvers: {
    marker: string
    resolve: (output: string) => void
  }[] = []
  private readonly onOutput?: (text: string) => void

  constructor(startTime: number, onOutput?: (text: string) => void) {
    this.startTime = startTime
    this.lastOutputTime = startTime
    this.onOutput = onOutput
  }

  /**
   * Records an output event for asciicast playback.
   */
  recordOutput(text: string): void {
    const elapsed = (Date.now() - this.startTime) / 1000
    this.events.push([elapsed, 'o', text])
  }

  /**
   * Records an input event for asciicast playback.
   */
  recordInput(command: string): void {
    const elapsed = (Date.now() - this.startTime) / 1000
    this.events.push([elapsed, 'i', command + '\n'])
  }

  /**
   * Appends text to the output buffer and updates the last output time.
   */
  appendToBuffer(text: string): void {
    this.outputBuffer += text
    this.lastOutputTime = Date.now()
  }

  /**
   * Gets the current output buffer.
   */
  getBuffer(): string {
    return this.outputBuffer
  }

  /**
   * Clears the output buffer.
   */
  clearBuffer(): void {
    this.outputBuffer = ''
  }

  /**
   * Clears the buffer up to and including the marker.
   */
  clearBufferUpToMarker(marker: string): void {
    if (this.outputBuffer.includes(marker)) {
      const markerIndex = this.outputBuffer.indexOf(marker)
      // Clear everything up to and including the marker, plus a bit more to catch the echo output
      const clearUpTo = markerIndex + marker.length + 10 // +10 for newline and echo output
      this.outputBuffer = this.outputBuffer.substring(
        Math.min(clearUpTo, this.outputBuffer.length),
      )
    }
  }

  /**
   * Gets the last output time for stability checks.
   */
  getLastOutputTime(): number {
    return this.lastOutputTime
  }

  /**
   * Resets the last output time.
   */
  resetLastOutputTime(): void {
    this.lastOutputTime = Date.now()
  }

  /**
   * Notifies the output callback if provided.
   */
  notifyOutput(text: string): void {
    this.onOutput?.(text)
  }

  /**
   * Registers a pending resolver for a marker.
   */
  registerPendingResolver(
    marker: string,
    resolve: (output: string) => void,
  ): void {
    this.pendingResolvers.push({ marker, resolve })
  }

  /**
   * Checks and resolves any pending resolvers that can be satisfied.
   */
  checkPendingResolvers(): void {
    for (let i = this.pendingResolvers.length - 1; i >= 0; i--) {
      const pending = this.pendingResolvers[i]
      if (pending && this.outputBuffer.includes(pending.marker)) {
        // Extract output before the marker
        const markerIndex = this.outputBuffer.indexOf(pending.marker)
        const output = this.outputBuffer.substring(0, markerIndex)

        // Remove from pending
        this.pendingResolvers.splice(i, 1)

        // Resolve the promise
        pending.resolve(output.trim())
      }
    }
  }

  /**
   * Gets all recorded events.
   */
  getEvents(): AsciicastEvent[] {
    return this.events
  }

  /**
   * Gets the start time.
   */
  getStartTime(): number {
    return this.startTime
  }
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
  const state = new PtySessionState(startTime, onOutput)

  // Create the PTY session
  const ptyHandle = await sandbox.process.createPty({
    id: sessionId,
    cols,
    rows,
    cwd,
    onData: (data) => {
      const text = new TextDecoder().decode(data)

      // Handle output through focused handlers
      state.recordOutput(text)
      state.appendToBuffer(text)
      state.notifyOutput(text)
      state.checkPendingResolvers()
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
    state.clearBuffer()
  }

  /**
   * Wait for the UUID% prompt pattern to appear, indicating terminal is ready.
   * This ensures commands have fully completed, including any buffered output
   * or background processes that might still be writing.
   *
   * @param stabilityMs - Milliseconds to wait with no new output after prompt (default: 300ms)
   * @returns The output captured before the prompt
   */
  async function waitForPrompt(stabilityMs = 300): Promise<string> {
    let outputBeforePrompt = ''
    const buffer = state.getBuffer()

    // Check if prompt pattern is already in buffer
    const promptMatch = buffer.match(UUID_PROMPT_PATTERN)
    if (promptMatch && promptMatch.index !== undefined) {
      outputBeforePrompt = buffer.substring(0, promptMatch.index)
    } else {
      // Wait for the prompt pattern to appear
      outputBeforePrompt = await new Promise<string>((resolve) => {
        const checkForPrompt = () => {
          const currentBuffer = state.getBuffer()
          const match = currentBuffer.match(UUID_PROMPT_PATTERN)

          if (match && match.index !== undefined) {
            resolve(currentBuffer.substring(0, match.index))
          } else {
            // Check again after a short delay
            setTimeout(checkForPrompt, 50)
          }
        }

        // Start checking
        checkForPrompt()
      })
    }

    // After prompt is found, wait for output stability
    // This ensures any buffered output or background processes have finished
    await waitForStability(() => state.getLastOutputTime(), stabilityMs)

    // Clear the buffer up to and including the prompt
    const finalBuffer = state.getBuffer()
    const finalMatch = finalBuffer.match(UUID_PROMPT_PATTERN)
    if (finalMatch && finalMatch.index !== undefined) {
      const clearUpTo = finalMatch.index + finalMatch[0].length
      state.clearBuffer()
      state.appendToBuffer(finalBuffer.substring(clearUpTo))
    } else {
      state.clearBuffer()
    }

    return outputBeforePrompt.trim()
  }

  async function executeCommand(command: string): Promise<string> {
    // Clear buffer before command
    state.clearBuffer()
    state.resetLastOutputTime()

    // Record the input event
    state.recordInput(command)

    // Send command directly (no marker needed - terminal shows UUID% when ready)
    await ptyHandle.sendInput(`${command}\n`)

    // Wait for the UUID% prompt to appear, then wait for stability
    const stabilityMs = 300
    const output = await waitForPrompt(stabilityMs)

    return output
  }

  function getRecording(): AsciicastRecording {
    return {
      header: {
        version: 2,
        width: cols,
        height: rows,
        timestamp: Math.floor(state.getStartTime() / 1000),
        title: `Kyoto VM Session - ${sessionId}`,
        env: {
          TERM: 'xterm-256color',
          SHELL: '/bin/bash',
        },
      },
      events: state.getEvents(),
    }
  }

  async function close(): Promise<void> {
    await ptyHandle.disconnect()
  }

  return {
    ptyHandle,
    executeCommand,
    waitForPrompt,
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
