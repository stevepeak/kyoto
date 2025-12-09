import { getStagedTsFiles, getUnstagedTsFiles } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { evaluateDiff } from '../helpers/stories/evaluate-diff-target'
import { logImpactedStories } from '../helpers/stories/log-impacted-stories'
import { createLogger, useCliLogger } from '../helpers/logging/logger'
import { type LogEntry } from '../types/logger'

interface VibeCheckProps {
  includeUnstaged?: boolean
}

export default function VibeCheck({
  includeUnstaged = false,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [outcome, setOutcome] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      const { fs, git } = await init({ requireAi: true })
      try {
        // Check for staged changes early, before expensive init
        if (!includeUnstaged) {
          if (!git.hasStagedChanges) {
            if (git.hasChanges) {
              setWarnings([
                <Box flexDirection="column" key="no-staged-with-unstaged">
                  <Text color="grey">No staged changes found.</Text>
                  <Text> </Text>
                  <Text color="grey">
                    You can vibe check your unstaged changes via:
                  </Text>
                  <Text color="yellow">
                    kyoto vibe check --include-unstaged
                  </Text>
                </Box>,
              ])
            } else {
              setWarnings([
                <Text color="grey" key="no-staged">
                  No staged changes found.
                </Text>,
              ])
            }
            // Give React time to render the messages before exiting
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(undefined)
              }, 100)
            })
            return
          }
        }

        // Check for changed TypeScript files
        const changedTsFiles = includeUnstaged
          ? await getUnstagedTsFiles(fs.gitRoot)
          : await getStagedTsFiles(fs.gitRoot)

        if (changedTsFiles.length === 0) {
          setWarnings([
            <Text color="grey" key="no-changed-files">
              No changed source files found.
            </Text>,
          ])
          // Give React time to render the messages before exiting
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 100)
          })
          return
        }

        const targetType = includeUnstaged ? 'unstaged' : 'staged'

        setIsRunning(true)
        const result = await evaluateDiff({ type: targetType }, logger)
        setIsRunning(false)

        if (cancelled) {
          return
        }

        // Collect outcome messages
        const outcomeMessages: LogEntry[] = []
        const outcomeLogger = createLogger({
          onLog: (entry) => {
            outcomeMessages.push(entry)
          },
        })

        // TODO show the reasoning here if in --verbose mode
        if (result.text) {
          outcomeLogger(
            <Box flexDirection="column">
              <Text>Reasoning</Text>
              <Text color="grey">{result.text}</Text>
            </Box>,
          )
        }

        logImpactedStories(result, outcomeLogger)

        // TODO test stories that changed
        // TODO check if we need to add new stoires
        outcomeLogger(<Text color="yellow">TODO check for new stories</Text>)

        setOutcome(outcomeMessages)

        // Give React time to render the messages before exiting
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 200)
        })
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
        setOutcome([
          {
            content: <Text color="red">{`\n❌ Error: ${message}`}</Text>,
            key: 'error',
          },
        ])
        setError(message)
        process.exitCode = 1

        // Give React time to render the error before exiting
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 200)
        })
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
      <Header message="The way of the vibe." />
      {warnings.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          {warnings.map((warning, index) => (
            <React.Fragment key={index}>{warning}</React.Fragment>
          ))}
        </Box>
      ) : null}
      {isRunning ? (
        <>
          <Box marginTop={1} gap={1}>
            <Text color="red">
              <Spinner type="squareCorners" />
            </Text>
            <Text>
              Analyzing {includeUnstaged ? 'all' : 'staged'} changes...
            </Text>
          </Box>
          {logs.map((line) => (
            <React.Fragment key={line.key}>
              <Text color="grey">
                {'  '}
                {line.content}
              </Text>
            </React.Fragment>
          ))}
        </>
      ) : null}
      {outcome.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          {outcome.map((line) => (
            <React.Fragment key={line.key}>{line.content}</React.Fragment>
          ))}
        </Box>
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
