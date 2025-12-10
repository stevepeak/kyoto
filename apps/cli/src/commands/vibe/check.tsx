import { type VibeCheckScope } from '@app/types'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useState } from 'react'

import { defaultVibeCheckAgents } from '../../agents'
import { init } from '../../helpers/config/assert-cli-prerequisites'
import { VibeAgents } from '../../helpers/display/vibe-agents'
import { getChangedFiles } from '../../helpers/vibe-check/get-changed-files'
import { writePlanFile } from '../../helpers/vibe-check/plan'
import { type AgentRunState } from '../../helpers/vibe-check/types'
import { Jumbo } from '../../ui/jumbo'

interface VibeCheckProps {
  staged?: boolean
}

export default function VibeCheck({
  staged = false,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<{
    gitRoot: string
    kyotoRoot: string
    scope: VibeCheckScope
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const runCheck = async (): Promise<void> => {
      try {
        const { fs, git } = await init({ requireAi: true })

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
    finalStates: AgentRunState[],
  ): Promise<void> => {
    if (!context) {
      return
    }

    try {
      await writePlanFile(finalStates, context.kyotoRoot)

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
        />
      )}
      {/* TODO implement the next stage of showing the results */}
      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
