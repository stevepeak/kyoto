import { type AgentRunState, type VibeCheckScope } from '@app/types'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useState } from 'react'

import { defaultVibeCheckAgents } from '../../agents'
import { type LanguageModel } from '../../helpers/config/get-model'
import { SummarizationAgent } from '../../helpers/display/summarization-agent'
import { VibeAgents } from '../../helpers/display/vibe-agents'
import { init } from '../../helpers/init'
import { getChangedFiles } from '../../helpers/vibe-check/get-changed-files'
import { writePlanFile } from '../../helpers/vibe-check/plan'
import { Jumbo } from '../../ui/jumbo'

interface VibeCheckProps {
  staged?: boolean
  timeoutMinutes?: number
}

export default function VibeCheck({
  staged = false,
  timeoutMinutes = 1,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<{
    gitRoot: string
    kyotoRoot: string
    scope: VibeCheckScope
    model: LanguageModel
  } | null>(null)
  const [finalStates, setFinalStates] = useState<AgentRunState[] | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  useEffect(() => {
    let cancelled = false

    const runCheck = async (): Promise<void> => {
      try {
        const { fs, git, model } = await init()

        // Determine which files to check
        const changedTsFiles = await getChangedFiles({
          staged,
          gitRoot: fs.gitRoot,
        })

        // Check for staged changes early
        if (staged && !git.hasStagedChanges) {
          if (git.hasChanges) {
            setWarnings([
              <Box flexDirection="column" key="no-staged-with-unstaged">
                <Text color="grey">No staged changes found.</Text>
                <Text> </Text>
                <Text color="grey">
                  You can vibe check all changes (including unstaged) via:
                </Text>
                <Text color="yellow">kyoto vibe check</Text>
              </Box>,
            ])
          } else {
            setWarnings([
              <Text color="grey" key="no-staged">
                No staged changes found.
              </Text>,
            ])
          }
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 500)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        if (changedTsFiles.length === 0) {
          setWarnings([
            <Text color="grey" key="no-changed-files">
              No changed source files found.
            </Text>,
          ])
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 500)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        const targetType = staged
          ? ({ type: 'staged' as const } as const)
          : ({ type: 'unstaged' as const } as const)

        setContext({
          gitRoot: fs.gitRoot,
          kyotoRoot: fs.root,
          scope: targetType,
          model,
        })
      } catch (err) {
        if (cancelled) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : staged
              ? 'Failed to evaluate staged changes'
              : 'Failed to evaluate changes'
        setError(message)
        process.exitCode = 1

        // Wait for error to be displayed before exiting
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 500)
        })

        if (!cancelled) {
          exit()
        }
      }
    }

    void runCheck()

    return () => {
      cancelled = true
    }
  }, [exit, staged])

  const handleAgentComplete = async (
    states: AgentRunState[],
  ): Promise<void> => {
    if (!context) {
      return
    }

    // Store states and trigger summarization
    setFinalStates(states)
    setIsSummarizing(true)
  }

  const handleSummarizationComplete = async (
    markdown: string,
  ): Promise<void> => {
    if (!context) {
      return
    }

    try {
      await writePlanFile(markdown, context.kyotoRoot)

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 250)
      })

      exit()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to write plan file'
      setError(message)
      process.exitCode = 1

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 500)
      })

      exit()
    }
  }

  const handleSummarizationError = (errorMessage: string): void => {
    setError(errorMessage)
    process.exitCode = 1
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      {warnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {warnings.map((warning, index) => (
            <React.Fragment key={index}>{warning}</React.Fragment>
          ))}
        </Box>
      )}
      {context && (
        <VibeAgents
          agents={defaultVibeCheckAgents}
          context={context}
          onComplete={handleAgentComplete}
          timeoutMinutes={timeoutMinutes}
        />
      )}
      {isSummarizing && finalStates && context && (
        <SummarizationAgent
          agentStates={finalStates}
          gitRoot={context.gitRoot}
          model={context.model}
          onComplete={handleSummarizationComplete}
          onError={handleSummarizationError}
        />
      )}
      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
