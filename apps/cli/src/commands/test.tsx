import { analyzeTestSuggestions, formatScopeDescription } from '@app/agents'
import { getScopeContext } from '@app/shell'
import { type VibeCheckContext } from '@app/types'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useRef, useState } from 'react'

import { setupVibeCheck } from '../helpers/vibe-check/hooks'
import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { MultiSelect } from '../ui/multi-select'
import { ScopeDisplay } from '../ui/ScopeDisplay'

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
  const [scopeDescription, setScopeDescription] = useState<string | null>(null)

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

      // Set scope description for display
      setScopeDescription(
        formatScopeDescription({ scope: setupResult.context.scope }),
      )

      try {
        // Retrieve scope content for the agent
        const scopeContent = await getScopeContext(
          setupResult.context.scope,
          setupResult.context.gitRoot,
        )

        const context: VibeCheckContext = {
          gitRoot: setupResult.context.gitRoot,
          scope: setupResult.context.scope,
          scopeContent,
          model: setupResult.context.model,
          ...(setupResult.context.github
            ? { github: setupResult.context.github }
            : {}),
        }

        // Run the test suggestions agent
        const result = await analyzeTestSuggestions({
          context,
          options: {
            progress: (_message) => {
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
    _selectedItems: { label: string; value: string }[],
  ): void => {
    // User can check/uncheck items with space, but we don't need to do anything on submit
    // The checkbox list is just for tracking what to test
    exit()
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <ScopeDisplay scopeDescription={scopeDescription} />
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
          <Box marginBottom={1}>
            <Text color="grey">
              Use arrow keys to navigate, space to toggle, Enter to exit.
            </Text>
          </Box>
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
