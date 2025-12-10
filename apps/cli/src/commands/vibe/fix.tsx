import { Box, Text, useApp } from 'ink'
import React, { useEffect, useState } from 'react'

import { init } from '../../helpers/config/assert-cli-prerequisites'
import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'

export default function VibeFix(): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Initializing...')

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        await init({ requireAi: true })
        setStatus('Analyzing vibe check results...')

        // TODO: Implement vibe fix logic
        // 1. Read previous vibe check results
        // 2. Identify fixable issues
        // 3. Apply automated fixes
        // 4. Report what was fixed

        logger(<Text color="yellow">⚠️ Vibe fix is not yet implemented.</Text>)
        logger(
          <Text color="grey">
            This command will apply automated fixes based on vibe check results.
          </Text>,
        )

        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 1000)
        })
      } catch (err) {
        if (cancelled) {
          return
        }

        const message =
          err instanceof Error ? err.message : 'Failed to apply vibe fixes'
        setError(message)
        process.exitCode = 1

        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 200)
        })
      } finally {
        if (!cancelled) {
          exit()
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [exit, logger])

  return (
    <Box flexDirection="column">
      <Header />
      {status && <Text color="cyan">{status}</Text>}
      {logs.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          {logs.map((line) => (
            <React.Fragment key={line.key}>{line.content}</React.Fragment>
          ))}
        </Box>
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
