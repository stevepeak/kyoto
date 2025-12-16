import { useCallback, useState } from 'react'

import { type StreamItem } from './types'

const MAX_STREAM_SIZE = 50

function generateStreamItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function useStream() {
  const [stream, setStream] = useState<StreamItem[]>([])

  const clearStream = useCallback(() => {
    setStream([])
  }, [])

  const addToStream = useCallback((item: StreamItem) => {
    setStream((prev) => [...prev.slice(-MAX_STREAM_SIZE), item])
  }, [])

  const log = useCallback(
    (text: string, opts?: { color?: string; dim?: boolean }) => {
      addToStream({ id: generateStreamItemId(), type: 'log', text, ...opts })
    },
    [addToStream],
  )

  const addDivider = useCallback(() => {
    addToStream({ id: generateStreamItemId(), type: 'divider' })
  }, [addToStream])

  const addAgentMessage = useCallback(
    (text: string) => {
      addToStream({ id: generateStreamItemId(), type: 'agent', text })
    },
    [addToStream],
  )

  const addTestResult = useCallback(
    (args: {
      description: string
      passed: boolean
      steps: string[]
      response: string
    }) => {
      addToStream({ id: generateStreamItemId(), type: 'test-result', ...args })
    },
    [addToStream],
  )

  return {
    stream,
    clearStream,
    log,
    addDivider,
    addAgentMessage,
    addTestResult,
  }
}
