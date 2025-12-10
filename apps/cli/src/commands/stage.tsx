import { analyzeStagingSuggestions } from '@app/agents'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { getModel } from '../helpers/config/get-model'
import { Jumbo } from '../ui/jumbo'

export default function Stage(): React.ReactElement {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<
    {
      order: number
      commitMessage: string
      files: string[]
      reasoning?: string
    }[]
  >([])

  useEffect(() => {
    let cancelled = false

    const runStage = async (): Promise<void> => {
      try {
        const { git } = await init({ requireAi: true })

        // Check if there are any changes
        if (!git.hasChanges) {
          setError('No uncommitted changes found.')
          setLoading(false)
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 2000)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        // Get model configuration
        setProgress('Loading AI model...')
        const { model } = await getModel()

        // Run the staging suggestions agent
        // Use 'unstaged' scope but the agent will analyze both staged and unstaged
        setProgress('Analyzing uncommitted changes...')
        const result = await analyzeStagingSuggestions({
          scope: { type: 'unstaged' },
          options: {
            model,
            progress: (message) => {
              if (!cancelled) {
                setProgress(message)
              }
            },
          },
        })

        if (!cancelled) {
          setSuggestions(result.suggestions)
          setLoading(false)

          // Auto-exit after showing results
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 100)
          })
          if (!cancelled) {
            exit()
          }
        }
      } catch (err) {
        if (cancelled) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Failed to analyze staging suggestions'
        setError(message)
        setLoading(false)
        process.exitCode = 1

        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 2000)
        })

        if (!cancelled) {
          exit()
        }
      }
    }

    void runStage()

    return () => {
      cancelled = true
    }
  }, [exit])

  if (loading) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>{progress}</Text>
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      </Box>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1}>
          <Text color="grey">No staging suggestions available.</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Box marginTop={1} flexDirection="column">
        <Text bold>Staging Suggestions</Text>
        <Text color="gray">Suggested commit groups in sequential order:</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {suggestions
          .sort((a, b) => a.order - b.order)
          .map((suggestion, index) => (
            <Box
              key={index}
              marginTop={index > 0 ? 1 : 0}
              flexDirection="column"
              paddingX={1}
              borderStyle="round"
              borderColor="blue"
            >
              <Box marginBottom={1}>
                <Text bold color="cyan">
                  Commit {suggestion.order}: {suggestion.commitMessage}
                </Text>
              </Box>
              {suggestion.reasoning && (
                <Box marginBottom={1}>
                  <Text color="gray">{suggestion.reasoning}</Text>
                </Box>
              )}
              <Box flexDirection="column" marginTop={1}>
                <Text color="yellow" bold>
                  Files to stage:
                </Text>
                {suggestion.files.map((file, fileIndex) => (
                  <Box key={fileIndex} marginLeft={2}>
                    <Text> • {file}</Text>
                  </Box>
                ))}
              </Box>
              <Box marginTop={1}>
                <Text color="gray" dimColor>
                  Run: git add {suggestion.files.join(' ')}
                </Text>
              </Box>
            </Box>
          ))}
      </Box>
    </Box>
  )
}
