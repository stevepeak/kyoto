import { Box, Text, useApp } from 'ink'
import { rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useCallback, useEffect, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { type Logger } from '../types/logger'

type LogEntry = {
  message: string
  color?: string
}

export default function Clear(): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const logger = useCallback<Logger>((message, color) => {
    setLogs((prev) => [...prev, { message, color }])
  }, [])

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        const { fs } = await init({ requireAi: false })

        const { stories, artifacts, root } = fs

        try {
          await stat(stories)
          await rm(stories, { recursive: true, force: true })
          logger('✓ Deleted stories directory', '#7ba179')
        } catch (err) {
          if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            logger('Stories directory does not exist, skipping', 'grey')
          } else {
            throw err
          }
        }

        try {
          await stat(artifacts)
          await rm(artifacts, { recursive: true, force: true })
          logger('✓ Deleted artifacts directory', '#7ba179')
        } catch (err) {
          if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            logger('Artifacts directory does not exist, skipping', 'grey')
          } else {
            throw err
          }
        }

        const vectraPath = join(root, '.ignore', 'vectra.json')
        try {
          await stat(vectraPath)
          await rm(vectraPath, { recursive: true, force: true })
          logger('✓ Deleted vectra data', '#7ba179')
        } catch (err) {
          if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            logger('Vectra data does not exist, skipping', 'grey')
          } else {
            throw err
          }
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to clear stories and vectra data'

        if (
          message.includes('not found') ||
          message.includes('.kyoto directory not found')
        ) {
          logger(`\n⚠️  ${message}\n`, '#c27a52')
        } else {
          setError(message)
        }
        process.exitCode = 1
      } finally {
        exit()
      }
    }

    void run()
  }, [exit, logger])

  return (
    <Box flexDirection="column">
      <Header />
      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
