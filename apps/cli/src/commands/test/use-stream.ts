import { useCallback, useState } from 'react'

import { type StreamItem } from './types'

const MAX_STREAM_SIZE = 50

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
      addToStream({ type: 'log', text, ...opts })
    },
    [addToStream],
  )

  const addDivider = useCallback(() => {
    addToStream({ type: 'divider' })
  }, [addToStream])

  const addAgentMessage = useCallback(
    (text: string) => {
      addToStream({ type: 'agent', text })
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
      addToStream({ type: 'test-result', ...args })
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
