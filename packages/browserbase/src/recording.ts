import Browserbase from '@browserbasehq/sdk'

export type RecordingEvent = {
  type: number
  data: unknown
  timestamp: number
}

/**
 * Retrieve session recording events from Browserbase.
 * Returns rrweb-compatible events that can be played back using rrweb-player.
 */
export async function getSessionRecording(args: {
  apiKey: string
  sessionId: string
}): Promise<RecordingEvent[]> {
  const { apiKey, sessionId } = args

  const bb = new Browserbase({ apiKey })

  const recording = await bb.sessions.recording.retrieve(sessionId)

  // The SDK returns an array of SessionRecording objects
  // Transform them to rrweb-compatible event format
  const events: RecordingEvent[] = recording.map((event) => ({
    type: event.type,
    data: event.data,
    timestamp: event.timestamp,
  }))

  return events
}
