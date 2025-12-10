import {
  type CommitInfo,
  getChangedTsFiles,
  getLatestCommit,
  getRecentCommits,
} from '@app/shell'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useRef, useState } from 'react'

import { init } from '../../helpers/config/assert-cli-prerequisites'
import { updateDetailsJson } from '../../helpers/config/update-details-json'
import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'
import { evaluateDiff } from '../../helpers/stories/evaluate-diff-target'
import { logImpactedStories } from '../../helpers/stories/log-impacted-stories'

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
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const [spinnerMessage, setSpinnerMessage] = useState<{
    sha: string
    message: string
    completed?: boolean
  } | null>(null)
  const shouldExitRef = useRef(false)
  const processingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let gitRoot: string
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
      logger(<Text color="grey">{'\nGoodbye! 👋'}</Text>)
      exit()
    }

    const start = async (): Promise<void> => {
      try {
        const { git, fs } = await init({
          requireAi: true,
        })
        gitRoot = fs.gitRoot

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
                No changed source files found in commit {latestCommit.shortHash}
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
              err instanceof Error ? err.message : 'Failed to evaluate commit'
            logger(
              <Text color="#c27a52">{`⚠️  Failed to evaluate commit: ${message}`}</Text>,
            )
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
      <Header message="The way of the vibe." />
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
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
