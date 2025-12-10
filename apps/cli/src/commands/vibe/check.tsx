import { getStagedTsFiles, getUnstagedTsFiles } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import React, { useEffect, useState } from 'react'

import { init } from '../../helpers/config/assert-cli-prerequisites'
import { AgentSpinnerList } from '../../helpers/display/agent-spinner-list'
import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'
import { defaultVibeCheckAgents } from '../../helpers/vibe-check/agents'
import { runVibeCheckAgents } from '../../helpers/vibe-check/run-vibe-check-agents'
import { type AgentRunState } from '../../helpers/vibe-check/types'

interface VibeCheckProps {
  includeUnstaged?: boolean
  dryRun?: boolean
}

export default function VibeCheck({
  includeUnstaged = false,
  dryRun = false,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const { logger } = useCliLogger()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [agentStates, setAgentStates] = useState<AgentRunState[]>([])

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

        setAgentStates(
          defaultVibeCheckAgents.map((agent) => ({
            id: agent.id,
            label: agent.label,
            status: 'pending' as const,
            progress: 'Queued',
          })),
        )

        const finalStates = await runVibeCheckAgents({
          agents: defaultVibeCheckAgents,
          context: {
            gitRoot: fs.gitRoot,
            target: targetType,
            changedFiles: changedTsFiles,
            logger,
          },
          delayMs: dryRun ? 5000 : undefined,
          onUpdate: (state) => {
            if (cancelled) {
              return
            }
            setAgentStates((prev) => {
              const index = prev.findIndex((item) => item.id === state.id)
              if (index === -1) {
                return prev
              }
              const next = [...prev]
              next[index] = state
              return next
            })
          },
        })

        if (cancelled) {
          return
        }

        setAgentStates(finalStates)
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 250)
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
      {agentStates.length > 0 ? (
        <AgentSpinnerList states={agentStates} />
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
