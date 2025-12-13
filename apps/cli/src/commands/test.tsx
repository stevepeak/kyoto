import { analyzeTestSuggestions } from '@app/agents'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useRef, useState } from 'react'

import { setupVibeCheck } from '../helpers/vibe-check/hooks'
import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { MultiSelect } from '../ui/multi-select'

interface TestProps {
  staged?: boolean
  timeoutMinutes?: number
  commitCount?: number
  commitSha?: string
  sinceBranch?: string
  last?: boolean
}

interface TestSuggestion {
  description: string
  category?: string
}

export default function Test({
  staged = false,
  timeoutMinutes = 1,
  commitCount,
  commitSha,
  sinceBranch,
  last,
}: TestProps): React.ReactElement {
  const { exit } = useApp()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<TestSuggestion[]>([])

  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const runTest = async (): Promise<void> => {
      // Setup vibe check (init, scope, files, warnings)
      const setupResult = await setupVibeCheck({
        staged,
        commitCount,
        commitSha,
        sinceBranch,
        last,
        onWarning: setWarnings,
        onError: setError,
        exit,
        cancelled: cancelledRef,
      })

      // If setup failed or was cancelled, exit early
      if (!setupResult.context || cancelledRef.current) {
        if (setupResult.error) {
          setLoading(false)
          process.exitCode = 1

          // Wait for error to be displayed before exiting
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 500)
          })

          if (!cancelledRef.current) {
            exit()
          }
        }
        return
      }

      try {
        // Run the test suggestions agent
        const result = await analyzeTestSuggestions({
          scope: setupResult.context.scope,
          options: {
            model: setupResult.context.model,
            progress: (message) => {
              // Could show progress if needed
            },
          },
        })

        if (cancelledRef.current) {
          return
        }

        setSuggestions(result.suggestions)
        setLoading(false)
      } catch (err) {
        if (cancelledRef.current) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : staged
              ? 'Failed to analyze staged changes'
              : 'Failed to analyze changes'
        setError(message)
        setLoading(false)
        process.exitCode = 1

        // Wait for error to be displayed before exiting
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 500)
        })

        if (!cancelledRef.current) {
          exit()
        }
      }
    }

    void runTest()

    return () => {
      cancelledRef.current = true
    }
  }, [exit, staged, commitCount, commitSha, sinceBranch, last])

  const handleSubmit = (
    selectedItems: Array<{ label: string; value: string }>,
  ): void => {
    // User can check/uncheck items with space, but we don't need to do anything on submit
    // The checkbox list is just for tracking what to test
    exit()
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="試験" title="Test suggestions" />
      {warnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {warnings.map((warning, index) => (
            <React.Fragment key={index}>{warning}</React.Fragment>
          ))}
        </Box>
      )}
      {loading && (
        <Box marginTop={1}>
          <Text>Analyzing code changes and generating test suggestions...</Text>
        </Box>
      )}
      {!loading && !error && suggestions.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="grey" marginBottom={1}>
            Use arrow keys to navigate, space to toggle, Enter to exit.
          </Text>
          <MultiSelect
            items={suggestions.map((suggestion, index) => ({
              label: suggestion.category
                ? `[${suggestion.category}] ${suggestion.description}`
                : suggestion.description,
              value: `test-${index}`,
            }))}
            onSubmit={handleSubmit}
          />
        </Box>
      )}
      {!loading && !error && suggestions.length === 0 && (
        <Box marginTop={1}>
          <Text color="yellow">
            No test suggestions found for the current scope.
          </Text>
        </Box>
      )}
      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
