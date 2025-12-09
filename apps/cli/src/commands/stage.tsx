import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useCallback, useEffect, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { evaluateDiffTarget } from '../helpers/stories/evaluate-diff-target'
import { logImpactedStories } from '../helpers/stories/log-impacted-stories'
import { type Logger } from '../types/logger'

interface VibeCheckProps {
  includeUnstaged?: boolean
}

export default function VibeCheck({
  includeUnstaged = false,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ message: string; color?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(true)

  const logger = useCallback<Logger>((message, color) => {
    setLogs((prev) => [...prev, { message, color }])
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const { fs } = await init({ requireAi: true })

        setIsRunning(true)
        const targetType = includeUnstaged ? 'unstaged' : 'staged'
        logger(
          includeUnstaged
            ? 'Evaluating unstaged changes (including untracked files)...'
            : 'Evaluating staged changes...',
        )

        const result = await evaluateDiffTarget(
          { type: targetType },
          fs.gitRoot,
        )

        if (cancelled) {
          return
        }

        if (result.text) {
          logger(result.text, 'grey')
        }

        logImpactedStories(result, logger)
        logger('TODO check for new stories', 'yellow')
      } catch (err) {
        if (cancelled) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : includeUnstaged
              ? 'Failed to evaluate unstaged changes'
              : 'Failed to evaluate staged changes'
        setError(message)
        process.exitCode = 1
      } finally {
        if (!cancelled) {
          setIsRunning(false)
          exit()
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [exit, logger, includeUnstaged])

  return (
    <Box flexDirection="column">
      <Header message="Kyoto" />
      <Text color="grey">
        {includeUnstaged
          ? 'Kyoto evaluates unstaged changes (including untracked files) to find impacted user stories.'
          : 'Kyoto evaluates the currently staged changes to find impacted user stories before you commit.'}
      </Text>
      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
      {isRunning ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text color="grey">
            {includeUnstaged
              ? 'Analyzing unstaged changes'
              : 'Analyzing staged changes'}
          </Text>
        </Box>
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
