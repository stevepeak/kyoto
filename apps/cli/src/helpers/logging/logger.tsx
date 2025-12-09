import { Text } from 'ink'
import React, { useMemo, useState } from 'react'

import { type LogEntry, type Logger } from '../../types/logger'
import { appendCliLogLine } from './cli-log-file'

function createLogKey(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function reactNodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(reactNodeToText).join('')
  }

  if (React.isValidElement(node)) {
    return reactNodeToText(node.props.children)
  }

  return String(node)
}

function normalizeLogMessage(message: React.ReactNode | string): {
  entry: LogEntry
  plainText: string
} {
  if (typeof message === 'string') {
    const key = createLogKey()
    return {
      entry: {
        content: <Text>{message}</Text>,
        key,
      },
      plainText: message,
    }
  }

  const plainText = reactNodeToText(message)
  const key = createLogKey()
  return {
    entry: {
      content: message,
      key,
    },
    plainText,
  }
}

interface CreateLoggerOptions {
  onLog?: (entry: LogEntry) => void
}

/**
 * Creates a logger that writes to the shared CLI log file and optionally
 * forwards log entries to a consumer (e.g., React state).
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const { onLog } = options

  return (message) => {
    const { entry, plainText } = normalizeLogMessage(message)
    if (onLog) {
      onLog(entry)
    }
    void appendCliLogLine(plainText)
  }
}

/**
 * React hook that returns a logger wired to component state and the CLI log.
 */
export function useCliLogger(): {
  logs: LogEntry[]
  logger: Logger
} {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const logger = useMemo(
    () =>
      createLogger({
        onLog: (entry) => {
          setLogs((prev) => [...prev, entry])
        },
      }),
    [setLogs],
  )

  return { logs, logger }
}
