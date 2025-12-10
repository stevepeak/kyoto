import {
  type CommitInfo,
  getChangedTsFiles,
  getLatestCommit,
  getRecentCommits,
  getStagedTsFiles,
  getUnstagedTsFiles,
} from '@app/shell'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useRef, useState } from 'react'

import { init } from '../../helpers/config/assert-cli-prerequisites'
import { updateDetailsJson } from '../../helpers/config/update-details-json'
import { AgentSpinnerList } from '../../helpers/display/agent-spinner-list'
import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'
import { evaluateDiff } from '../../helpers/stories/evaluate-diff-target'
import { logImpactedStories } from '../../helpers/stories/log-impacted-stories'
import { defaultVibeCheckAgents } from '../../helpers/vibe-check/agents'
import { runVibeCheckAgents } from '../../helpers/vibe-check/run-vibe-check-agents'
import { type AgentRunState } from '../../helpers/vibe-check/types'

interface VibeCheckProps {
  staged?: boolean
  watch?: boolean
  watchCommits?: boolean
  dryRun?: boolean
  maxLength?: number
  interval?: number
  simulateCount?: number
}

export default function VibeCheck({
  staged = false,
  watch = false,
  watchCommits = false,
  dryRun = false,
  maxLength = 60,
  interval = 1000,
  simulateCount,
}: VibeCheckProps): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()
  const [warnings, setWarnings] = useState<React.ReactNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [agentStates, setAgentStates] = useState<AgentRunState[]>([])
  const [spinnerMessage, setSpinnerMessage] = useState<{
    sha: string
    message: string
    completed?: boolean
  } | null>(null)
  const shouldExitRef = useRef(false)
  const processingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    let watchInterval: ReturnType<typeof setInterval> | null = null
    let lastCheckedFiles: string[] = []
    let isRunning = false
    let cleanupCalled = false

    const cleanup = (): void => {
      if (cleanupCalled) {
        return
      }
      cleanupCalled = true
      shouldExitRef.current = true
      setSpinnerMessage(null)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      if (watchInterval) {
        clearInterval(watchInterval)
        watchInterval = null
      }
      if (watchCommits) {
        logger(<Text color="grey">{'\nGoodbye! 👋'}</Text>)
      }
    }

    const runCheck = async (): Promise<void> => {
      if (isRunning) {
        return
      }
      isRunning = true

      try {
        const { fs, git } = await init({ requireAi: true })

        // Determine which files to check
        let changedTsFiles: string[]
        if (staged) {
          // Only check staged changes
          changedTsFiles = await getStagedTsFiles(fs.gitRoot)
        } else {
          // Check all changes (staged + unstaged)
          const stagedFiles = await getStagedTsFiles(fs.gitRoot)
          const unstagedFiles = await getUnstagedTsFiles(fs.gitRoot)
          // Combine and deduplicate
          const allFiles = new Set([...stagedFiles, ...unstagedFiles])
          changedTsFiles = Array.from(allFiles)
        }

        // In watch mode, only run if files have changed
        if (watch) {
          const filesChanged =
            changedTsFiles.length !== lastCheckedFiles.length ||
            changedTsFiles.some((file) => !lastCheckedFiles.includes(file))

          if (!filesChanged && lastCheckedFiles.length > 0) {
            isRunning = false
            return
          }
          lastCheckedFiles = [...changedTsFiles]
        }

        // Check for staged changes early, before expensive init
        if (staged) {
          if (!git.hasStagedChanges) {
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
            if (!watch) {
              // Give React time to render the messages before exiting
              await new Promise((resolve) => {
                setTimeout(() => {
                  resolve(undefined)
                }, 100)
              })
              isRunning = false
              return
            }
            isRunning = false
            return
          }
        }

        if (changedTsFiles.length === 0) {
          setWarnings([
            <Text color="grey" key="no-changed-files">
              No changed source files found.
            </Text>,
          ])
          if (!watch) {
            // Give React time to render the messages before exiting
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(undefined)
              }, 100)
            })
            isRunning = false
            return
          }
          isRunning = false
          return
        }

        const targetType = staged ? 'staged' : 'unstaged'

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
          isRunning = false
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
          isRunning = false
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

        // Give React time to render the error before exiting
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 200)
        })
      } finally {
        isRunning = false
        if (!watch && !cancelled) {
          exit()
        }
      }
    }

    const start = async (): Promise<void> => {
      if (watchCommits) {
        // Commit watching mode
        try {
          const { git, fs } = await init({ requireAi: true })

          const detailsPath = fs.config

          const commit = await getLatestCommit(fs.gitRoot)

          if (!commit) {
            throw new Error('No commits found in repository')
          }

          let lastCommitHash: string | null = commit.shortHash
          const repoSlug =
            git.owner && git.repo
              ? `${git.owner}/${git.repo}`
              : (fs.gitRoot.split('/').pop() ?? 'repository')
          logger(`Monitoring commits in ${repoSlug}...`)
          logger('\n')

          const handleCommit = async (
            latestCommit: CommitInfo,
          ): Promise<void> => {
            const truncatedMessage =
              latestCommit.message.length > maxLength
                ? `${latestCommit.message.substring(0, maxLength - 3)}...`
                : latestCommit.message

            // Check for changed TypeScript files
            const changedTsFiles = await getChangedTsFiles(
              latestCommit.hash,
              fs.gitRoot,
            )

            if (changedTsFiles.length === 0) {
              logger(
                <Text color="grey">
                  No changed source files found in commit{' '}
                  {latestCommit.shortHash}
                </Text>,
              )
              return
            }

            setSpinnerMessage({
              sha: latestCommit.shortHash,
              message: truncatedMessage,
            })

            try {
              const result = await evaluateDiff(
                {
                  type: 'commit',
                  commitSha: latestCommit.hash,
                },
                logger,
              )

              setSpinnerMessage({
                sha: latestCommit.shortHash,
                message: truncatedMessage,
                completed: true,
              })

              logImpactedStories(result, logger)
              logger(<Text color="yellow">TODO check for new stories</Text>)

              await updateDetailsJson(detailsPath, git.branch, latestCommit.hash)
              lastCommitHash = latestCommit.shortHash
            } catch (err) {
              setSpinnerMessage(null)
              const message =
                err instanceof Error
                  ? err.message
                  : 'Failed to evaluate commit'
              logger(
                <Text color="#c27a52">{`⚠️  Failed to evaluate commit: ${message}`}</Text>,
              )
            }
          }

          if (simulateCount && simulateCount > 0) {
            const commitsToSimulate = await getRecentCommits(
              simulateCount,
              fs.gitRoot,
            )
            const orderedCommits = commitsToSimulate.slice().reverse()

            if (orderedCommits.length === 0) {
              throw new Error('No commits found to simulate')
            }

            for (const simulated of orderedCommits) {
              await handleCommit(simulated)
              lastCommitHash = simulated.shortHash
            }
          }

          pollRef.current = setInterval(async () => {
            if (shouldExitRef.current || processingRef.current || cancelled) {
              return
            }

            const latestCommit = await getLatestCommit(fs.gitRoot)

            if (!latestCommit || latestCommit.shortHash === lastCommitHash) {
              return
            }

            processingRef.current = true
            handleCommit(latestCommit)
              .catch((err) => {
                const message =
                  err instanceof Error ? err.message : 'Unknown error'
                setError(message)
                process.exitCode = 1
              })
              .finally(() => {
                processingRef.current = false
              })
          }, interval)
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to monitor commits'
          setError(message)
          process.exitCode = 1
          cleanup()
        }
      } else {
        // File watching mode (existing behavior)
        if (watch) {
          // Run initial check
          await runCheck()

          // Set up polling interval (check every 2 seconds)
          watchInterval = setInterval(() => {
            if (!cancelled && !isRunning) {
              void runCheck()
            }
          }, 2000)
        } else {
          await runCheck()
        }
      }
    }

    void start()

    const onSig = (): void => {
      shouldExitRef.current = true
      cleanup()
      if (!watchCommits && !watch) {
        exit()
      }
    }

    if (watchCommits) {
      process.on('SIGINT', onSig)
      process.on('SIGTERM', onSig)
    }

    return () => {
      cancelled = true
      if (watchCommits) {
        process.off('SIGINT', onSig)
        process.off('SIGTERM', onSig)
      }
      cleanup()
      if (!watchCommits && !watch) {
        exit()
      }
    }
  }, [
    exit,
    logger,
    staged,
    watch,
    watchCommits,
    dryRun,
    maxLength,
    interval,
    simulateCount,
  ])

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
      {spinnerMessage ? (
        <Box marginBottom={1} gap={1}>
          {spinnerMessage.completed ? (
            <Text color="green">√</Text>
          ) : (
            <Text color="red">
              <Spinner type="dots" />
            </Text>
          )}
          <Text color="#7b301f">{spinnerMessage.sha}</Text>
          <Text color="grey">{spinnerMessage.message}</Text>
        </Box>
      ) : null}
      {agentStates.length > 0 ? (
        <AgentSpinnerList states={agentStates} />
      ) : null}
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
