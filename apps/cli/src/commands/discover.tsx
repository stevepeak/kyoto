import { agents } from '@app/agents'
import { type DiscoveredStory } from '@app/schemas'
import { getCurrentBranch, getCurrentCommitSha } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { mkdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites'
import { getModel } from '../helpers/config/get-model'
import { updateDetailsJson } from '../helpers/config/update-details-json'
import { Header } from '../helpers/display/display-header'
import {
  findTypeScriptFiles,
  validateFilePath,
} from '../helpers/file/discovery'
import { processDiscoveredCandidates } from '../helpers/stories/process-candidates'
import { type Logger } from '../types/logger'

interface DiscoverProps {
  folder?: string
  model?: string
  provider?: 'openai' | 'vercel' | 'auto'
  limit?: number
}

type SpinnerState = {
  id: number
  text: string
  state: 'running' | 'success' | 'fail'
}

export default function Discover({
  folder,
  model,
  provider = 'auto',
  limit,
}: DiscoverProps): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ message: string; color?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeSpinner, setActiveSpinner] = useState<SpinnerState | null>(null)
  const spinnerIdRef = useRef(0)

  const logger = useCallback<Logger>((message, color) => {
    setLogs((prev) => [...prev, { message, color }])
  }, [])

  const createSpinner = useCallback((text: string) => {
    const id = spinnerIdRef.current++
    setActiveSpinner({ id, text, state: 'running' })

    return {
      update: (next: string) => {
        setActiveSpinner((prev) =>
          prev && prev.id === id ? { ...prev, text: next } : prev,
        )
      },
      succeed: (next?: string) => {
        setActiveSpinner((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                text: next ?? prev.text,
                state: 'success',
              }
            : prev,
        )
      },
      fail: (next?: string) => {
        setActiveSpinner((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                text: next ?? prev.text,
                state: 'fail',
              }
            : prev,
        )
      },
      stop: () => {
        setActiveSpinner((prev) => (prev && prev.id === id ? null : prev))
      },
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const run = async (): Promise<void> => {
      try {
        const { gitRoot } = await assertCliPrerequisites()

        const kyotoDir = join(gitRoot, '.kyoto')
        await mkdir(kyotoDir, { recursive: true })

        const inputPath = folder || '.'
        await validateFilePath(inputPath)

        const resolvedPath = resolve(gitRoot, inputPath)
        const stats = await stat(resolvedPath)
        const isDirectory = stats.isDirectory()

        const filesToProcess = isDirectory
          ? await findTypeScriptFiles(inputPath)
          : [inputPath]

        if (filesToProcess.length === 0) {
          logger(`\n⚠️  No TypeScript files found in ${inputPath}\n`, '#c27a52')
          return
        }

        logger(
          `• Exploring stories within ${filesToProcess.length} ${filesToProcess.length === 1 ? 'file' : 'files'}`,
          'grey',
        )

        let totalProcessedStories = 0
        const storyLimit = limit

        const {
          model: selectedModel,
          modelId,
          provider: selectedProvider,
        } = await getModel({
          model,
          provider,
          logger,
        })
        logger(`• Using ${modelId} on ${selectedProvider}`, 'grey')

        if (storyLimit) {
          logger(`• Limit ${storyLimit.toString()} behaviors`, 'grey')
        }

        for (const filePath of filesToProcess) {
          if (!isMounted) {
            break
          }

          if (storyLimit && totalProcessedStories >= storyLimit) {
            logger(
              `\n• Reached story limit of ${storyLimit.toString()}. Stopping discovery.\n`,
              'grey',
            )
            break
          }
          logger('')
          logger(`Evaluating ${filePath}`)

          try {
            const remainingLimit = storyLimit
              ? storyLimit - totalProcessedStories
              : undefined

            const discoverySpinner = createSpinner(
              'Discovery Agent: Starting...',
            )

            const discoveryResult = await agents.discovery.run({
              filePath,
              options: {
                model: selectedModel,
                maxStories: remainingLimit,
                logger: (msg: string) => {
                  discoverySpinner.update(`Discovery Agent: ${msg}`)
                },
              },
            })

            const candidates = (
              discoveryResult as { stories: DiscoveredStory[] }
            ).stories

            if (candidates.length === 0) {
              discoverySpinner.succeed(
                'Discovery Agent: No candidate behaviors found',
              )
              continue
            }

            discoverySpinner.succeed(
              `Discovery Agent: Found ${candidates.length} candidate behavior${candidates.length === 1 ? '' : 's'}`,
            )

            logger('')

            const processedStories = await processDiscoveredCandidates({
              candidates,
              model: selectedModel,
              logger,
              createSpinner,
            })

            totalProcessedStories += processedStories.length
          } catch (err) {
            logger(`✖ ${filePath}`, 'red')
            logger(`\n⚠️  Failed to generate stories\n`, '#c27a52')

            if (err instanceof Error) {
              if (
                err.message.includes('API key') ||
                err.message.includes('authentication') ||
                err.message.includes('unauthorized')
              ) {
                logger(
                  'The API key appears to be invalid or expired.\n',
                  '#c27a52',
                )
                logger(
                  'Please check your API key configuration. Run `kyoto init` to reconfigure.\n',
                  '#7c6653',
                )
              } else if (
                err.message.includes('Vercel AI Gateway') ||
                err.message.includes('Gateway request failed') ||
                err.message.includes('Invalid error response format')
              ) {
                logger('AI Gateway error detected.\n', '#c27a52')
                logger(
                  'The AI Gateway request failed. This could be due to:\n',
                  '#7c6653',
                )
                logger('  - Invalid or expired API key\n', '#7c6653')
                logger('  - Network connectivity issues\n', '#7c6653')
                logger(
                  '  - Gateway service temporarily unavailable\n',
                  '#7c6653',
                )
                logger(
                  '\nRun `kyoto init` to reconfigure your API key, or try using --provider openai instead.\n',
                  '#7c6653',
                )
              } else {
                logger(`Error: ${err.message}\n`, '#7c6653')
              }
            } else {
              logger('An unknown error occurred.\n', '#7c6653')
            }
          }
        }

        const detailsPath = join(kyotoDir, 'details.json')
        const branch = await getCurrentBranch(gitRoot)
        const sha = await getCurrentCommitSha(gitRoot)
        await updateDetailsJson(detailsPath, branch, sha)

        if (totalProcessedStories === 0) {
          logger('\nNo stories generated\n', '#c27a52')
          return
        }

        logger(
          `\n√ Processed ${totalProcessedStories} ${totalProcessedStories === 1 ? 'story' : 'stories'} from ${filesToProcess.length} ${filesToProcess.length === 1 ? 'file' : 'files'}:\n`,
          '#7ba179',
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to generate stories'
        if (
          message.includes('not found') ||
          message.includes('Path is not a file') ||
          message.includes('Path is not a directory')
        ) {
          logger(`\n⚠️  ${message}\n`, '#c27a52')
        } else {
          setError(message)
        }
        process.exitCode = 1
      } finally {
        setActiveSpinner(null)
        exit()
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [createSpinner, exit, folder, limit, logger, model, provider])

  return (
    <Box flexDirection="column">
      <Header message="Discover" />
      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
      {activeSpinner ? (
        <Box marginTop={1} gap={1} flexDirection="row">
          {activeSpinner.state === 'running' ? (
            <Text color="red">
              <Spinner type="dots" />
            </Text>
          ) : (
            <Text color={activeSpinner.state === 'success' ? 'green' : 'red'}>
              •
            </Text>
          )}
          <Text>{activeSpinner.text}</Text>
        </Box>
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
