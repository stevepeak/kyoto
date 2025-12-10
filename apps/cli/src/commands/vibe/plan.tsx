import { Box, Text, useApp } from 'ink'
import React, { useEffect, useState } from 'react'

import { init } from '../../helpers/config/assert-cli-prerequisites'
import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'

export default function VibePlan(): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Initializing...')

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        await init({ requireAi: true })
        setStatus('Creating fix plan...')

        // TODO: Implement vibe plan logic
        // 1. Read previous vibe check results
        // 2. Analyze issues and create a structured plan
        // 3. Output plan in a format that other agents can use
        // 4. Display the plan to the user

        logger(<Text color="yellow">⚠️ Vibe plan is not yet implemented.</Text>)
        logger(
          <Text color="grey">
            This command will create a plan for applying fixes based on vibe
            check results.
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
          err instanceof Error ? err.message : 'Failed to create vibe fix plan'
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
      <Header message="Planning vibe fixes." />
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
