import { agents } from '@app/agents'
import { type DiffEvaluatorOutput } from '@app/schemas'
import {
  type CommitInfo,
  getChangedTsFiles,
  getCurrentBranch,
  getLatestCommit,
} from '@app/shell'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { mkdir } from 'node:fs/promises'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites'
import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { updateDetailsJson } from '../helpers/config/update-details-json'
import { Header } from '../helpers/display/display-header'
import { findStoriesByTrace } from '../helpers/stories/find-stories-by-trace'
import { createSearchStoriesTool } from '../helpers/tools/search-stories-tool'
import { type Logger } from '../types/logger'

interface VibesProps {
  maxLength?: number
  interval?: number
}

async function deterministicCheck(
  commitSha: string,
  gitRoot: string,
): Promise<DiffEvaluatorOutput | null> {
  const changedTsFiles = await getChangedTsFiles(commitSha, gitRoot)

  if (changedTsFiles.length === 0) {
    return null
  }

  const matchedStoryPaths = await findStoriesByTrace({
    files: changedTsFiles,
  })

  if (matchedStoryPaths.length > 0) {
    const matchedStories: DiffEvaluatorOutput['stories'] =
      matchedStoryPaths.map((filePath) => ({
        filePath,
        scopeOverlap: 'significant',
        reasoning: `Changed file matches story code reference`,
      }))

    return {
      text: '',
      stories: matchedStories,
    }
  }

  return null
}

async function processCommit(
  commit: CommitInfo,
  gitRoot: string,
): Promise<DiffEvaluatorOutput> {
  const deterministicResult = await deterministicCheck(commit.hash, gitRoot)

  if (deterministicResult === null) {
    return {
      text: 'No relevant files changed',
      stories: [],
    }
  }

  const searchStoriesTool = createSearchStoriesTool()
  const aiResult: DiffEvaluatorOutput = await agents.diffEvaluator.run({
    commitSha: commit.hash,
    searchStoriesTool,
    options: {
      maxSteps: agents.diffEvaluator.options.maxSteps,
      onProgress: () => {
        // Progress callback - currently unused
      },
    },
  })

  if (deterministicResult.stories.length > 0) {
    return {
      text: aiResult.text,
      stories: [...deterministicResult.stories, ...aiResult.stories],
    }
  }

  return aiResult
}

export default function Vibes({
  maxLength = 60,
  interval = 1000,
}: VibesProps): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ message: string; color?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [spinnerMessage, setSpinnerMessage] = useState<{
    message: string
    color?: string
  } | null>(null)
  const [status, setStatus] = useState<'idle' | 'watching' | 'stopped'>('idle')
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
      setStatus('stopped')
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      logger('\nGoodbye! 👋', 'grey')
      exit()
    }

    const start = async (): Promise<void> => {
      try {
        const { gitRoot: root, github } = await assertCliPrerequisites({
          requireAi: true,
        })
        gitRoot = root

        const { root: kyotoRoot, details } = await pwdKyoto()
        detailsPath = details
        await mkdir(kyotoRoot, { recursive: true })

        const commit = await getLatestCommit(gitRoot)

        if (!commit) {
          throw new Error('No commits found in repository')
        }

        let lastCommitHash: string | null = commit.shortHash
        const repoSlug = github
          ? `${github.owner}/${github.repo}`
          : (gitRoot.split('/').pop() ?? 'repository')
        logger(`Monitoring commits to ${repoSlug}...`, 'grey')
        logger('')
        setStatus('watching')

        const handleCommit = async (
          latestCommit: CommitInfo,
        ): Promise<void> => {
          const truncatedMessage =
            latestCommit.message.length > maxLength
              ? `${latestCommit.message.substring(0, maxLength - 3)}...`
              : latestCommit.message

          setSpinnerMessage({
            message: `${latestCommit.shortHash} ${truncatedMessage}`,
            color: '#7b301f',
          })

          try {
            const result = await processCommit(latestCommit, gitRoot)

            setSpinnerMessage(null)

            if (result.stories.length > 0) {
              logger('')
              logger(
                `${result.stories.length} ${result.stories.length === 1 ? 'story' : 'stories'} impacted:`,
                '#7ba179',
              )
              logger('')

              for (const story of result.stories) {
                const overlapColor =
                  story.scopeOverlap === 'significant'
                    ? '#c27a52'
                    : story.scopeOverlap === 'moderate'
                      ? '#d4a574'
                      : 'grey'

                logger(story.scopeOverlap.toUpperCase(), overlapColor)
                logger(`  ${story.filePath}`, 'white')
                logger(`  ${story.reasoning}`, 'grey')
                logger('')
              }
            } else {
              logger('  No stories impacted', 'grey')
            }
            logger('  TODO check for new stories', 'yellow')

            const branch = await getCurrentBranch(gitRoot)
            await updateDetailsJson(detailsPath, branch, latestCommit.hash)
            lastCommitHash = latestCommit.shortHash
          } catch (err) {
            setSpinnerMessage(null)
            const message =
              err instanceof Error ? err.message : 'Failed to evaluate commit'
            logger(`⚠️  Failed to evaluate commit: ${message}`, '#c27a52')
          }
        }

        pollRef.current = setInterval(async () => {
          if (shouldExitRef.current || processingRef.current) {
            return
          }

          const latestCommit = await getLatestCommit(gitRoot)

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
  }, [exit, interval, logger, maxLength])

  return (
    <Box flexDirection="column">
      <Header message="Vibe in Kyoto" />
      {spinnerMessage ? (
        <Box marginBottom={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text color={spinnerMessage.color}>{spinnerMessage.message}</Text>
        </Box>
      ) : null}
      {status === 'watching' ? (
        <Text color="grey">Watching for new commits...</Text>
      ) : null}
      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
