import {
  type CommitInfo,
  getCurrentBranch,
  getLatestCommit,
  getRecentCommits,
} from '@app/shell'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { updateDetailsJson } from '../helpers/config/update-details-json'
import { Header } from '../helpers/display/display-header'
import { evaluateDiffTarget } from '../helpers/stories/evaluate-diff-target'
import { logImpactedStories } from '../helpers/stories/log-impacted-stories'
import { type Logger } from '../types/logger'

interface VibeProps {
  maxLength?: number
  interval?: number
  simulateCount?: number
}

export default function Vibe({
  maxLength = 60,
  interval = 1000,
  simulateCount,
}: VibeProps): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ message: string; color?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [spinnerMessage, setSpinnerMessage] = useState<{
    sha: string
    message: string
    completed?: boolean
  } | null>(null)
  const shouldExitRef = useRef(false)
  const processingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const logger = useCallback<Logger>((message, color) => {
    setLogs((prev) => [...prev, { message, color }])
  }, [])

  useEffect(() => {
    let gitRoot: string
    let detailsPath: string
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
      logger('\nGoodbye! 👋', 'grey')
      exit()
    }

    const start = async (): Promise<void> => {
      try {
        const { git, fs } = await init({
          requireAi: true,
        })
        gitRoot = fs.gitRoot

        const detailsPath = fs.details

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

          setSpinnerMessage({
            sha: latestCommit.shortHash,
            message: truncatedMessage,
          })

          try {
            const result = await evaluateDiffTarget(
              { type: 'commit', commitSha: latestCommit.hash },
              fs.gitRoot,
            )

            setSpinnerMessage({
              sha: latestCommit.shortHash,
              message: truncatedMessage,
              completed: true,
            })

            logImpactedStories(result, logger)
            logger('TODO check for new stories', 'yellow')

            await updateDetailsJson(detailsPath, git.branch, latestCommit.hash)
            lastCommitHash = latestCommit.shortHash
          } catch (err) {
            setSpinnerMessage(null)
            const message =
              err instanceof Error ? err.message : 'Failed to evaluate commit'
            logger(`⚠️  Failed to evaluate commit: ${message}`, '#c27a52')
          }
        }

        if (simulateCount && simulateCount > 0) {
          const commitsToSimulate = await getRecentCommits(
            simulateCount,
            gitRoot,
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
          if (shouldExitRef.current || processingRef.current) {
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
          err instanceof Error ? err.message : 'Failed to monitor commits'
        setError(message)
        process.exitCode = 1
        cleanup()
      }
    }

    void start()

    const onSig = (): void => {
      shouldExitRef.current = true
      cleanup()
    }

    process.on('SIGINT', onSig)
    process.on('SIGTERM', onSig)

    return () => {
      process.off('SIGINT', onSig)
      process.off('SIGTERM', onSig)
      cleanup()
    }
  }, [exit, interval, logger, maxLength, simulateCount])

  return (
    <Box flexDirection="column">
      <Header message="Vibe in Kyoto" />
      <Text color="grey">
        Kyoto monitors code changes finding new/changed user behaviors. New or
        changed user behaviors will be tested via browser automation and deep
        trace analysis to ensure existing and new functionality remains working.
      </Text>
      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
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
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
